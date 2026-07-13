-- Insert categories if not present
INSERT INTO exam_categories (name, slug) VALUES 
('UPSC Prelims', 'upsc-prelims'),
('RPSC', 'rpsc')
ON CONFLICT (name) DO NOTHING;

-- Seed Syllabus Nodes for UPSC Prelims
-- We first fetch the category ID in our queries, or we can use subqueries.
DO $$
DECLARE
    upsc_id UUID;
    rpsc_id UUID;
    polity_id UUID;
    economy_id UUID;
    env_id UUID;
    history_id UUID;
    geo_id UUID;
    scitech_id UUID;
    ir_id UUID;
    
    raj_history_id UUID;
    raj_polity_id UUID;
    raj_economy_id UUID;
    raj_geo_id UUID;
    gen_sci_id UUID;
    current_id UUID;
BEGIN
    SELECT id INTO upsc_id FROM exam_categories WHERE slug = 'upsc-prelims' LIMIT 1;
    SELECT id INTO rpsc_id FROM exam_categories WHERE slug = 'rpsc' LIMIT 1;

    -- ----------------------------------------------------
    -- UPSC SEED DATA
    -- ----------------------------------------------------
    IF upsc_id IS NOT NULL THEN
        -- Level 1: Subject areas
        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'Polity', 'Indian Polity and Governance') 
        RETURNING id INTO polity_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'Economy', 'Economic and Social Development') 
        RETURNING id INTO economy_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'Environment', 'Environment, Ecology and Biodiversity') 
        RETURNING id INTO env_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'History', 'History of India and Indian National Movement') 
        RETURNING id INTO history_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'Geography', 'Physical, Social, Economic Geography of India and World') 
        RETURNING id INTO geo_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'Science & Tech', 'General Science and Technological Advancements') 
        RETURNING id INTO scitech_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (upsc_id, 'IR', 'International Relations and Bilateral Affairs') 
        RETURNING id INTO ir_id;

        -- Level 2: Core Topics
        INSERT INTO syllabus_nodes (exam_category_id, subject, topic, parent_id) 
        VALUES (upsc_id, 'Polity', 'Constitutional Bodies & Offices', polity_id);
        
        INSERT INTO syllabus_nodes (exam_category_id, subject, topic, parent_id) 
        VALUES (upsc_id, 'Polity', 'Fundamental Rights & DPSPs', polity_id);

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic, parent_id) 
        VALUES (upsc_id, 'Economy', 'Banking & Monetary Policy (RBI, Digital Rupee)', economy_id);

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic, parent_id) 
        VALUES (upsc_id, 'Environment', 'Wildlife Conservation (Amur Falcons, Tiger Reserves)', env_id);
    END IF;

    -- ----------------------------------------------------
    -- RPSC SEED DATA
    -- ----------------------------------------------------
    IF rpsc_id IS NOT NULL THEN
        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (rpsc_id, 'History', 'History, Art, Culture, Literature & Heritage of Rajasthan') 
        RETURNING id INTO raj_history_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (rpsc_id, 'Geography', 'Geography of Rajasthan') 
        RETURNING id INTO raj_geo_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (rpsc_id, 'Polity', 'Administrative and Political System of Rajasthan') 
        RETURNING id INTO raj_polity_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (rpsc_id, 'Economy', 'Economy of Rajasthan & State Budget') 
        RETURNING id INTO raj_economy_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (rpsc_id, 'Science & Tech', 'General Science, Technology & Environment') 
        RETURNING id INTO gen_sci_id;

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic) 
        VALUES (rpsc_id, 'Current Affairs', 'Current Events of Rajasthan, National & International Importance') 
        RETURNING id INTO current_id;

        -- Level 2: Core State Topics
        INSERT INTO syllabus_nodes (exam_category_id, subject, topic, parent_id) 
        VALUES (rpsc_id, 'History', 'Mewar, Marwar dynasties and historical landmarks', raj_history_id);

        INSERT INTO syllabus_nodes (exam_category_id, subject, topic, parent_id) 
        VALUES (rpsc_id, 'Economy', 'Rajasthan State Budget and flagship welfare schemes', raj_economy_id);
    END IF;
END $$;
