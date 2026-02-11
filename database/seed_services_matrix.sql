-- ================================================
-- SEED DATA FOR BILLING MATRIX SERVICES
-- ================================================
-- Populates the services table with the exact columns requested by the user.

-- FUNCTION: Helper to get department ID by code
CREATE OR REPLACE FUNCTION get_dept_id(p_code VARCHAR) RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM departments WHERE code = p_code);
END;
$$ LANGUAGE plpgsql;

-- 1. Immedia Services (IMMED)
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
(get_dept_id('IMMED'), 'Estrategia y Gestión de Campañas de Paid Media', 'PAID_MEDIA_STRATEGY', 'revenue', 10),
(get_dept_id('IMMED'), 'Set-up inicial', 'PAID_MEDIA_SETUP', 'revenue', 20)
ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Imcontent Services (IMCONT)
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
(get_dept_id('IMCONT'), 'Branding', 'BRANDING', 'revenue', 10),
(get_dept_id('IMCONT'), 'Diseño de contenido', 'CONTENT_DESIGN', 'revenue', 20),
(get_dept_id('IMCONT'), 'Generación de contenido con IA', 'AI_CONTENT', 'revenue', 30),
(get_dept_id('IMCONT'), 'Gestión de RRSS', 'SOCIAL_MEDIA_MGMT', 'revenue', 40),
(get_dept_id('IMCONT'), 'Gestión de Influencers y UGC', 'INFLUENCER_UGC', 'revenue', 50),
(get_dept_id('IMCONT'), 'Setup Inicial', 'CONTENT_SETUP', 'revenue', 60)
ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name;

-- 3. Immoralia Services (IMMOR)
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
(get_dept_id('IMMOR'), 'Agency Automation', 'AGENCY_AUTO', 'revenue', 10),
(get_dept_id('IMMOR'), 'Consultoría y automatización de procesos', 'CONSULTING_AUTO', 'revenue', 20),
(get_dept_id('IMMOR'), 'SEO', 'SEO', 'revenue', 30),
(get_dept_id('IMMOR'), 'Web dev', 'WEB_DEV', 'revenue', 40)
ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name;

-- 4. Immoral General Services (IMMORAL)
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
(get_dept_id('IMMORAL'), 'Estrategia y gestión de marketing automation y email marketing', 'MKT_AUTO_EMAIL', 'revenue', 10),
(get_dept_id('IMMORAL'), 'Horas/Otros', 'OTHER_HOURS', 'revenue', 20)
ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name;

DROP FUNCTION IF EXISTS get_dept_id;
