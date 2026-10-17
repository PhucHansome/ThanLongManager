-- =====================================================================
-- THẦN LONG MOBILE AUTO PRO - SUPABASE SCHEMA & RPC FUNCTIONS
-- =====================================================================
-- Tương thích 100% với Tool Desktop PyQt5 & Web Quản Lý 2 Role (User & Admin)
-- Tích hợp thanh toán VietQR động và Webhook Sepay.vn an toàn
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. BẢNG USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    full_name VARCHAR(100),
    email VARCHAR(100),
    status INT DEFAULT 1, -- 1: active, 0: locked
    delflag BOOLEAN DEFAULT false,
    locked_reason TEXT,
    note TEXT,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updtime TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG LICENSES
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMPTZ NOT NULL,
    status INT DEFAULT 1, -- 1: active, 0: expired
    delflag BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updtime TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG USER_MACHINE_MAPPINGS (Dành cho tool auto desktop HWID)
CREATE TABLE IF NOT EXISTS public.user_machine_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    machine_id VARCHAR(100) NOT NULL,
    note TEXT,
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, machine_id)
);

-- 4. BẢNG LOGIN_LOGS (Dedup theo ngày)
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    machine_id VARCHAR(100),
    login_date DATE NOT NULL DEFAULT CURRENT_DATE,
    attempt_count INT DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_success BOOLEAN DEFAULT true,
    UNIQUE(username, login_date, ip_address)
);

-- 5. BẢNG PRICING (Bảng giá các gói gia hạn)
CREATE TABLE IF NOT EXISTS public.pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    months INT NOT NULL UNIQUE,
    price NUMERIC(15, 2) NOT NULL,
    discount_pct INT DEFAULT 0,
    label VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG PAYMENT_ORDERS (Đơn gia hạn VietQR)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    months INT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    qr_url TEXT,
    bank_txn_id VARCHAR(100),
    license_before TIMESTAMPTZ NOT NULL,
    license_after TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. BẢNG BANK_TRANSACTIONS (Lưu webhook từ Sepay/Ngân hàng)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_txn_id VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. BẢNG REVENUE_LEDGER (Sổ cái doanh thu thực nhận sau trừ phí hoa hồng)
CREATE TABLE IF NOT EXISTS public.revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
    gross NUMERIC(15, 2) NOT NULL,
    commission_pct NUMERIC(5, 2) DEFAULT 0,
    commission_amt NUMERIC(15, 2) DEFAULT 0,
    net_amount NUMERIC(15, 2) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEX TỐI ƯU HIỆU NĂNG
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON public.licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_code ON public.payment_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_month_year ON public.revenue_ledger(month, year);

-- =====================================================================
-- CÁC HÀM RPC (REMOTE PROCEDURE CALLS)
-- =====================================================================

-- RPC 1: fn_login_v2
CREATE OR REPLACE FUNCTION public.fn_login_v2(
    p_username TEXT,
    p_password TEXT,
    p_ip TEXT DEFAULT NULL,
    p_machine_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_license RECORD;
    v_days_left INT;
BEGIN
    SELECT * INTO v_user
    FROM public.users
    WHERE username = p_username AND delflag = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', false, 'message', 'Tài khoản không tồn tại');
    END IF;

    -- Kiểm tra hash mật khẩu (bcrypt)
    IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
        -- Ghi log thất bại
        INSERT INTO public.login_logs (username, ip_address, machine_id, login_date, is_success)
        VALUES (p_username, p_ip, p_machine_id, CURRENT_DATE, false)
        ON CONFLICT (username, login_date, ip_address)
        DO UPDATE SET attempt_count = login_logs.attempt_count + 1, last_attempt_at = CURRENT_TIMESTAMP;

        RETURN jsonb_build_object('status', false, 'message', 'Mật khẩu không chính xác');
    END IF;

    IF v_user.status = 0 THEN
        RETURN jsonb_build_object('status', false, 'message', 'Tài khoản đã bị khoá. Lý do: ' || COALESCE(v_user.locked_reason, 'Liên hệ Admin'));
    END IF;

    -- Cập nhật lần login cuối
    UPDATE public.users
    SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = p_ip, updtime = CURRENT_TIMESTAMP
    WHERE id = v_user.id;

    -- Map machine nếu có
    IF p_machine_id IS NOT NULL AND p_machine_id <> '' THEN
        INSERT INTO public.user_machine_mappings (user_id, ip_address, machine_id, last_active_at)
        VALUES (v_user.id, p_ip, p_machine_id, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, machine_id)
        DO UPDATE SET last_active_at = CURRENT_TIMESTAMP, ip_address = p_ip;
    END IF;

    -- Lấy license
    SELECT * INTO v_license
    FROM public.licenses
    WHERE user_id = v_user.id AND delflag = false
    ORDER BY end_date DESC LIMIT 1;

    IF FOUND THEN
        v_days_left := GREATEST(0, EXTRACT(DAY FROM (v_license.end_date - CURRENT_TIMESTAMP))::INT);
    ELSE
        v_days_left := 0;
    END IF;

    -- Log thành công
    INSERT INTO public.login_logs (user_id, username, ip_address, machine_id, login_date, is_success)
    VALUES (v_user.id, p_username, p_ip, p_machine_id, CURRENT_DATE, true)
    ON CONFLICT (username, login_date, ip_address)
    DO UPDATE SET attempt_count = login_logs.attempt_count + 1, last_attempt_at = CURRENT_TIMESTAMP, is_success = true;

    RETURN jsonb_build_object(
        'status', true,
        'message', 'Đăng nhập thành công',
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'full_name', v_user.full_name,
            'email', v_user.email,
            'role', v_user.role,
            'status', v_user.status,
            'locked_reason', v_user.locked_reason,
            'last_login_at', CURRENT_TIMESTAMP,
            'last_login_ip', p_ip
        ),
        'license', CASE WHEN v_license.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_license.id,
                'start_date', v_license.start_date,
                'end_date', v_license.end_date,
                'days_left', v_days_left,
                'status', v_license.status,
                'is_expired', (v_license.end_date < CURRENT_TIMESTAMP)
            )
        ELSE NULL END
    );
END;
$$;

-- RPC 2: fn_change_password
CREATE OR REPLACE FUNCTION public.fn_change_password(
    p_username TEXT,
    p_old_pass TEXT,
    p_new_pass TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user
    FROM public.users
    WHERE username = p_username AND delflag = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', false, 'message', 'Tài khoản không tồn tại');
    END IF;

    IF v_user.password_hash != crypt(p_old_pass, v_user.password_hash) THEN
        RETURN jsonb_build_object('status', false, 'message', 'Mật khẩu cũ không đúng');
    END IF;

    IF LENGTH(p_new_pass) < 6 THEN
        RETURN jsonb_build_object('status', false, 'message', 'Mật khẩu mới phải có ít nhất 6 ký tự');
    END IF;

    UPDATE public.users
    SET password_hash = crypt(p_new_pass, gen_salt('bf', 10)),
        updtime = CURRENT_TIMESTAMP
    WHERE id = v_user.id;

    RETURN jsonb_build_object('status', true, 'message', 'Đổi mật khẩu thành công');
END;
$$;

-- RPC 3: fn_get_my_license
CREATE OR REPLACE FUNCTION public.fn_get_my_license(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_license RECORD;
    v_days_left INT;
BEGIN
    SELECT * INTO v_license
    FROM public.licenses
    WHERE user_id = p_user_id AND delflag = false
    ORDER BY end_date DESC LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', false, 'message', 'Chưa có license');
    END IF;

    v_days_left := GREATEST(0, EXTRACT(DAY FROM (v_license.end_date - CURRENT_TIMESTAMP))::INT);

    RETURN jsonb_build_object(
        'status', true,
        'license', jsonb_build_object(
            'id', v_license.id,
            'start_date', v_license.start_date,
            'end_date', v_license.end_date,
            'days_left', v_days_left,
            'status', v_license.status,
            'is_expired', (v_license.end_date < CURRENT_TIMESTAMP)
        )
    );
END;
$$;

-- RPC 4: fn_create_account
CREATE OR REPLACE FUNCTION public.fn_create_account(
    p_username TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_email TEXT,
    p_role TEXT DEFAULT 'user',
    p_initial_months INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_user_id UUID;
    v_end_date TIMESTAMPTZ;
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RETURN jsonb_build_object('status', false, 'message', 'Username đã tồn tại');
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email AND p_email <> '') THEN
        RETURN jsonb_build_object('status', false, 'message', 'Email đã được sử dụng');
    END IF;

    INSERT INTO public.users (username, password_hash, role, full_name, email, status)
    VALUES (
        p_username,
        crypt(p_password, gen_salt('bf', 10)),
        COALESCE(p_role, 'user'),
        p_full_name,
        p_email,
        1
    ) RETURNING id INTO v_new_user_id;

    v_end_date := CURRENT_TIMESTAMP + (COALESCE(p_initial_months, 1) || ' month')::INTERVAL;

    INSERT INTO public.licenses (user_id, start_date, end_date, status)
    VALUES (v_new_user_id, CURRENT_TIMESTAMP, v_end_date, 1);

    RETURN jsonb_build_object(
        'status', true,
        'message', 'Tạo tài khoản thành công',
        'user_id', v_new_user_id,
        'end_date', v_end_date
    );
END;
$$;

-- RPC 5: fn_extend_license
CREATE OR REPLACE FUNCTION public.fn_extend_license(
    p_user_id UUID,
    p_months INT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_license RECORD;
    v_new_end TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_license
    FROM public.licenses
    WHERE user_id = p_user_id AND delflag = false
    ORDER BY end_date DESC LIMIT 1;

    IF NOT FOUND THEN
        v_new_end := CURRENT_TIMESTAMP + (p_months || ' month')::INTERVAL;
        INSERT INTO public.licenses (user_id, start_date, end_date, status)
        VALUES (p_user_id, CURRENT_TIMESTAMP, v_new_end, 1);
    ELSE
        -- Quy tắc tính: còn hạn thì cộng tiếp, hết hạn thì tính từ hôm nay
        IF v_license.end_date >= CURRENT_TIMESTAMP THEN
            v_new_end := v_license.end_date + (p_months || ' month')::INTERVAL;
        ELSE
            v_new_end := CURRENT_TIMESTAMP + (p_months || ' month')::INTERVAL;
        END IF;

        UPDATE public.licenses
        SET end_date = v_new_end, status = 1, updtime = CURRENT_TIMESTAMP
        WHERE id = v_license.id;
    END IF;

    RETURN jsonb_build_object(
        'status', true,
        'message', 'Gia hạn thành công',
        'new_end_date', v_new_end
    );
END;
$$;

-- RPC 6: fn_create_renewal_order
CREATE OR REPLACE FUNCTION public.fn_create_renewal_order(
    p_user_id UUID,
    p_months INT,
    p_bank_code TEXT DEFAULT 'MBBank',
    p_bank_account TEXT DEFAULT '0987654321',
    p_bank_name TEXT DEFAULT 'NGUYEN VAN ADMIN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pricing RECORD;
    v_license RECORD;
    v_license_before TIMESTAMPTZ;
    v_license_after TIMESTAMPTZ;
    v_order_code TEXT;
    v_qr_url TEXT;
    v_order_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_pricing
    FROM public.pricing
    WHERE months = p_months AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', false, 'message', 'Gói gia hạn không hợp lệ');
    END IF;

    SELECT * INTO v_license
    FROM public.licenses
    WHERE user_id = p_user_id AND delflag = false
    ORDER BY end_date DESC LIMIT 1;

    IF FOUND THEN
        v_license_before := v_license.end_date;
        IF v_license.end_date >= CURRENT_TIMESTAMP THEN
            v_license_after := v_license.end_date + (p_months || ' month')::INTERVAL;
        ELSE
            v_license_after := CURRENT_TIMESTAMP + (p_months || ' month')::INTERVAL;
        END IF;
    ELSE
        v_license_before := CURRENT_TIMESTAMP;
        v_license_after := CURRENT_TIMESTAMP + (p_months || ' month')::INTERVAL;
    END IF;

    -- Sinh order_code: TLBB + 6 số ngẫu nhiên
    v_order_code := 'TLBB' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

    -- VietQR API URL
    v_qr_url := 'https://img.vietqr.io/image/' || p_bank_code || '-' || p_bank_account || '-compact2.png' ||
                '?amount=' || v_pricing.price::BIGINT ||
                '&addInfo=' || v_order_code ||
                '&accountName=' || replace(p_bank_name, ' ', '%20');

    v_expires_at := CURRENT_TIMESTAMP + INTERVAL '15 minutes';

    INSERT INTO public.payment_orders (
        order_code, user_id, months, amount, status, qr_url,
        license_before, license_after, expires_at
    )
    VALUES (
        v_order_code, p_user_id, p_months, v_pricing.price, 'pending', v_qr_url,
        v_license_before, v_license_after, v_expires_at
    )
    RETURNING id INTO v_order_id;

    RETURN jsonb_build_object(
        'status', true,
        'order_id', v_order_id,
        'order_code', v_order_code,
        'amount', v_pricing.price,
        'months', p_months,
        'qr_url', v_qr_url,
        'license_before', v_license_before,
        'license_after', v_license_after,
        'expires_at', v_expires_at
    );
END;
$$;

-- RPC 7: fn_confirm_payment (Chống Race Condition, An toàn tuyệt đối)
CREATE OR REPLACE FUNCTION public.fn_confirm_payment(
    p_order_code TEXT,
    p_bank_txn_id TEXT,
    p_amount NUMERIC,
    p_description TEXT DEFAULT '',
    p_raw_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_commission_pct NUMERIC := 0.0; -- % hoa hồng gateway (Sepay)
    v_commission_amt NUMERIC;
    v_net_amount NUMERIC;
BEGIN
    -- 1. Lock dòng order bằng FOR UPDATE
    SELECT * INTO v_order
    FROM public.payment_orders
    WHERE order_code = p_order_code
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Ghi log giao dịch không khớp
        INSERT INTO public.bank_transactions (bank_txn_id, amount, description, raw_payload)
        VALUES (p_bank_txn_id, p_amount, p_description || ' [UNMATCHED ORDER: ' || p_order_code || ']', p_raw_payload)
        ON CONFLICT (bank_txn_id) DO NOTHING;

        RETURN jsonb_build_object('status', false, 'message', 'Không tìm thấy đơn hàng: ' || p_order_code);
    END IF;

    -- 2. Kiểm tra nếu đã thanh toán trước đó (Idempotency)
    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('status', true, 'message', 'Đơn hàng đã được thanh toán trước đó', 'order_id', v_order.id);
    END IF;

    -- 3. Kiểm tra số tiền
    IF p_amount < v_order.amount THEN
        RETURN jsonb_build_object('status', false, 'message', 'Số tiền thanh toán không đủ. Cần ' || v_order.amount || ', thực nhận ' || p_amount);
    END IF;

    -- 4. Lưu giao dịch ngân hàng & dedup
    INSERT INTO public.bank_transactions (bank_txn_id, amount, description, raw_payload)
    VALUES (p_bank_txn_id, p_amount, p_description, p_raw_payload)
    ON CONFLICT (bank_txn_id) DO NOTHING;

    -- 5. Cập nhật trạng thái đơn hàng
    UPDATE public.payment_orders
    SET status = 'paid',
        paid_at = CURRENT_TIMESTAMP,
        bank_txn_id = p_bank_txn_id
    WHERE id = v_order.id;

    -- 6. Gia hạn license cho user
    UPDATE public.licenses
    SET end_date = v_order.license_after,
        status = 1,
        updtime = CURRENT_TIMESTAMP
    WHERE user_id = v_order.user_id AND delflag = false;

    -- 7. Ghi sổ cái doanh thu revenue_ledger
    v_commission_amt := ROUND((p_amount * v_commission_pct / 100), 2);
    v_net_amount := p_amount - v_commission_amt;

    INSERT INTO public.revenue_ledger (
        order_id, gross, commission_pct, commission_amt, net_amount,
        month, year, created_at
    )
    VALUES (
        v_order.id, p_amount, v_commission_pct, v_commission_amt, v_net_amount,
        EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT, CURRENT_TIMESTAMP
    );

    RETURN jsonb_build_object(
        'status', true,
        'message', 'Xác nhận thanh toán và gia hạn thành công',
        'order_id', v_order.id,
        'order_code', v_order.order_code,
        'new_end_date', v_order.license_after
    );
END;
$$;

-- =====================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- =====================================================================

-- 1. Bảng giá mặc định
INSERT INTO public.pricing (months, price, discount_pct, label, is_active)
VALUES
    (1, 100000, 0, 'Gói 1 Tháng', true),
    (3, 270000, 10, 'Gói 3 Tháng (-10%)', true),
    (6, 480000, 20, 'Gói 6 Tháng (-20%)', true),
    (12, 840000, 30, 'Gói 1 Năm (-30%)', true)
ON CONFLICT (months) DO UPDATE
SET price = EXCLUDED.price, discount_pct = EXCLUDED.discount_pct, label = EXCLUDED.label;

-- 2. Tài khoản Admin & User mẫu
-- Mật khẩu mặc định: 123456
INSERT INTO public.users (username, password_hash, role, full_name, email, status)
VALUES
    ('admin', crypt('123456', gen_salt('bf', 10)), 'admin', 'Quản Trị Viên Hệ Thống', 'admin@thanlongauto.pro', 1),
    ('user_test', crypt('123456', gen_salt('bf', 10)), 'user', 'Nguyễn Văn Game Thủ', 'user@thanlongauto.pro', 1)
ON CONFLICT (username) DO NOTHING;

-- Gán license 30 ngày cho user_test
INSERT INTO public.licenses (user_id, start_date, end_date, status)
SELECT id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 1
FROM public.users WHERE username = 'user_test'
ON CONFLICT DO NOTHING;
