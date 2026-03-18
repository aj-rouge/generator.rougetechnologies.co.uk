-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =====================================================
-- Insert condition groups
-- =====================================================
INSERT OR IGNORE INTO conditions (group_key, group_name, created_at, updated_at) VALUES
('electronics', 'Electronics', unixepoch(), unixepoch()),
('business', 'Business & Industrial', unixepoch(), unixepoch()),
('babyHealthBeauty', 'Baby, Health & Beauty', unixepoch(), unixepoch()),
('general', 'General', unixepoch(), unixepoch());

-- =====================================================
-- Insert condition options for each group
-- =====================================================

-- Electronics conditions
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 1, 'New', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 2, 'Opened - never used', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 3, 'Certified - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 4, 'Excellent - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 5, 'Very Good - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 6, 'Good - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 7, 'Seller refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 8, 'Used', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 9, 'For parts or not working', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'electronics';

-- Business conditions
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 1, 'New', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 2, 'New other (see details)', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 3, 'Certified refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 4, 'Excellent - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 5, 'Very Good - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 6, 'Good - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 7, 'Seller refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 8, 'Used', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 9, 'For parts or not working', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'business';

-- Baby/Health/Beauty conditions
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 1, 'New', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 2, 'New other (see details)', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 3, 'Used', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 4, 'For parts or not working', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 5, 'Certified - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 6, 'Excellent - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 7, 'Very Good - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 8, 'Good - Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 9, 'Seller refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'babyHealthBeauty';

-- General conditions
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 1, 'New', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'general';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 2, 'Used', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'general';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 3, 'Refurbished', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'general';
INSERT OR IGNORE INTO condition_options (condition_group_id, option_order, option_value, created_at, updated_at)
SELECT id, 4, 'For parts or not working', unixepoch(), unixepoch() FROM conditions WHERE group_key = 'general';

-- =====================================================
-- Insert categories
-- =====================================================
-- Parent categories
INSERT OR IGNORE INTO categories (slug, name, parent_category, condition_group_id, ebay_store_link, keywords, created_at, updated_at) VALUES
-- Computers & Tablets
('computers-tablets', 'Computers & Tablets', NULL, 
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Computers-Tablets-Networking/_i.html?_sacat=58058',
 json_array('Tablet Computer', 'Gaming Computer', 'Buy Personal Computer'), 
 unixepoch(), unixepoch()),

-- Smart Home
('smart-home', 'Smart Home', NULL,
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700',
 json_array('Home Smart Devices', 'Smart Home Devices', 'Smart home automation devices'),
 unixepoch(), unixepoch()),

-- Mobile Phones & Wearable Tech
('mobile-phones-wearable-tech', 'Mobile Phones & Wearable Tech', NULL,
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032',
 json_array('Buy mobile phones', 'Mobile phones for sale', 'Buy Smart Watch'),
 unixepoch(), unixepoch()),

-- Audio & Visual
('audio-visual', 'Audio & Visual', NULL,
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293',
 json_array('Wireless headphones', 'Bluetooth speaker', 'Audio visual equipment'),
 unixepoch(), unixepoch()),

-- Gaming
('gaming', 'Gaming', NULL,
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249',
 json_array('Gaming consoles', 'Gaming controller', 'PC Gaming'),
 unixepoch(), unixepoch()),

-- Digital Cameras & Photography
('digital-cameras-photography', 'Digital Cameras & Photography', NULL,
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Cameras-Photography/_i.html?_sacat=625',
 json_array('Digital Cameras', 'Drones with cameras', 'Camera lenses'),
 unixepoch(), unixepoch()),

-- Other Products
('other-products', 'Other Products', NULL,
 (SELECT id FROM conditions WHERE group_key = 'general'),
 'https://www.ebay.co.uk/str/rougetechnologies',
 json_array('Makeup products', 'Skincare products', 'Business tech products'),
 unixepoch(), unixepoch()),

-- Children of Computers & Tablets
('laptops', 'Laptops', 'computers-tablets',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Laptops-Netbooks/_i.html?_sacat=175672',
 json_array('Gaming Laptop', 'Buy Laptop', 'Work Laptop'),
 unixepoch(), unixepoch()),

('tablets-and-ereaders', 'Tablets and eReaders', 'computers-tablets',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Tablets-eBook-Readers/_i.html?_sacat=171485',
 json_array('Buy iPad', 'Order Tablet Online', 'Tablet Computer'),
 unixepoch(), unixepoch()),

('desktop-computers', 'Desktop Computers', 'computers-tablets',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Computers-Tablets-Networking/_i.html?_sacat=58058',
 json_array('Desktop Computer', 'Desktop Personal Computer', 'PC Desktop Computer'),
 unixepoch(), unixepoch()),

('computer-components', 'Computer Components', 'computers-tablets',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Laptop-Desktop-Accessories/_i.html?_sacat=31530',
 json_array('Shop Computer Components', 'Computer Parts Hardware', 'PC Components'),
 unixepoch(), unixepoch()),

('other-computers-tablets', 'Other Computers & Tablets', 'computers-tablets',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Computers-Tablets-Networking/_i.html?_sacat=58058',
 json_array('Computer Accessories', 'Personal Computer Accessories', 'Laptop computer accessories'),
 unixepoch(), unixepoch()),

-- Children of Smart Home
('home-automation', 'Home Automation', 'smart-home',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700',
 json_array('Smart home automation devices', 'Smart home gadgets', 'Smart home products'),
 unixepoch(), unixepoch()),

('wifi-routers-networking', 'Wifi, Routers & Networking', 'smart-home',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700',
 json_array('Wifi router for home', 'Home wifi routers', 'Wireless routers'),
 unixepoch(), unixepoch()),

('security', 'Security', 'smart-home',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700',
 json_array('Security camera', 'Home camera security', 'Home alarm systems'),
 unixepoch(), unixepoch()),

('diy', 'DIY', 'smart-home',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700',
 json_array('DIY products', 'Tools and equipment', 'Kitchen and appliances'),
 unixepoch(), unixepoch()),

('other-smart-home', 'Other Smart Home', 'smart-home',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700',
 json_array('Smart home automation devices', 'Smart home gadgets', 'Smart home products'),
 unixepoch(), unixepoch()),

-- Children of Mobile Phones & Wearable Tech
('apple-iphone', 'Apple iPhone', 'mobile-phones-wearable-tech',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032',
 json_array('iPhone for sale', 'Buy iPhone', 'Shop iPhone'),
 unixepoch(), unixepoch()),

('android-smart-phones', 'Android Smart Phones', 'mobile-phones-wearable-tech',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032',
 json_array('Cheap android phones', 'Android mobile phone', 'Android smartphone'),
 unixepoch(), unixepoch()),

('smart-watches', 'Smart Watches', 'mobile-phones-wearable-tech',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Smart-Watches/_i.html?_sacat=178893',
 json_array('Smart watch for women', 'Mens smart watch', 'Fitness watches'),
 unixepoch(), unixepoch()),

('chargers', 'Chargers', 'mobile-phones-wearable-tech',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032',
 json_array('Buy iPhone chargers', 'Buy laptop chargers', 'Buy portable chargers'),
 unixepoch(), unixepoch()),

('other-mobile-phones-wearable-tech', 'Other Mobile Phones & Wearable Tech', 'mobile-phones-wearable-tech',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032',
 json_array('Smart ring', 'iPhone accessories', 'USB C charging cable'),
 unixepoch(), unixepoch()),

-- Children of Audio & Visual
('headphones', 'Headphones', 'audio-visual',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293',
 json_array('Wireless headphones', 'Noise cancelling headphones', 'Wireless earbuds'),
 unixepoch(), unixepoch()),

('tvs', 'TVs', 'audio-visual',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293',
 json_array('Smart TVs', 'TV wall brackets', 'Buy televisions'),
 unixepoch(), unixepoch()),

('projectors', 'Projectors', 'audio-visual',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293',
 json_array('Home projector', 'Home cinema projector', 'Projector for television'),
 unixepoch(), unixepoch()),

('speakers', 'Speakers', 'audio-visual',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293',
 json_array('Bluetooth speaker', 'Portable speakers', 'Wireless speakers'),
 unixepoch(), unixepoch()),

('other-sound-vision', 'Other Sound & Vision', 'audio-visual',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293',
 json_array('Audio accessories and cables', 'TV wall brackets', 'Cables and accessories'),
 unixepoch(), unixepoch()),

-- Children of Gaming
('video-games', 'Video Games', 'gaming',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249',
 json_array('Shop video games', 'Video games shop', 'PS5 games'),
 unixepoch(), unixepoch()),

('consoles', 'Consoles', 'gaming',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249',
 json_array('Console for games', 'Games console', 'Video games console'),
 unixepoch(), unixepoch()),

('pc-gaming', 'PC Gaming', 'gaming',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249',
 json_array('Gaming laptops', 'Gaming desktops', 'Gaming monitors'),
 unixepoch(), unixepoch()),

('gaming-headsets', 'Gaming Headsets', 'gaming',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249',
 json_array('Gaming headset', 'Wireless gaming headset', 'Headset for gaming'),
 unixepoch(), unixepoch()),

('other-gaming', 'Other Gaming', 'gaming',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249',
 json_array('Gaming accessories', 'Game accessories', 'Buy gaming accessories'),
 unixepoch(), unixepoch()),

-- Children of Digital Cameras & Photography
('digital-cameras', 'Digital Cameras', 'digital-cameras-photography',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Cameras-Photography/_i.html?_sacat=625',
 json_array('Digital Cameras', 'DSLR camera', 'DSLR digital cameras'),
 unixepoch(), unixepoch()),

('drones', 'Drones', 'digital-cameras-photography',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Camera-Drones/_i.html?_sacat=179697',
 json_array('Drones with cameras', 'DJI drones UK', 'Buy drones UK'),
 unixepoch(), unixepoch()),

('camcorders', 'Camcorders', 'digital-cameras-photography',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Camcorders/_i.html?_sacat=11724',
 json_array('Digital video camera', 'Digital video camcorder', '4K video camera'),
 unixepoch(), unixepoch()),

('lenses', 'Lenses', 'digital-cameras-photography',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Lenses-Filters/_i.html?_sacat=78997',
 json_array('Camera lenses', 'DSLR camera lenses', 'Canon camera lenses'),
 unixepoch(), unixepoch()),

('other-digital-cameras-photography', 'Other Digital Cameras & Photography', 'digital-cameras-photography',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Camera-Drone-Photo-Accessories/_i.html?_sacat=15200',
 json_array('Camera accessories', 'Camera equipment', 'Digital camera equipment'),
 unixepoch(), unixepoch()),

-- Children of Other Products
('health-and-beauty', 'Health and Beauty', 'other-products',
 (SELECT id FROM conditions WHERE group_key = 'babyHealthBeauty'),
 'https://www.ebay.co.uk/str/rougetechnologies/Health-Beauty/_i.html?_sacat=26395',
 json_array('Makeup products', 'Skincare products', 'Womens makeup'),
 unixepoch(), unixepoch()),

('musical-instruments-dj-equipment', 'Musical Instruments & DJ Equipment', 'other-products',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Musical-Instruments-DJ-Equipment/_i.html?_sacat=619',
 json_array('Wireless speakers', 'Musical instruments', 'Noise cancelling headphones'),
 unixepoch(), unixepoch()),

('in-car-tech', 'In Car Tech', 'other-products',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies/Vehicle-Parts-Accessories/_i.html?_sacat=131090',
 json_array('Sat nav', 'Dash cams', 'Apple CarPlay'),
 unixepoch(), unixepoch()),

('business-office', 'Business & Office', 'other-products',
 (SELECT id FROM conditions WHERE group_key = 'business'),
 'https://www.ebay.co.uk/str/rougetechnologies/Business-Office-Industrial/_i.html?_sacat=12576',
 json_array('Card payment machines', 'Business wifi routers', 'Security camera'),
 unixepoch(), unixepoch()),

('miscellaneous-tech', 'Miscellaneous Tech', 'other-products',
 (SELECT id FROM conditions WHERE group_key = 'electronics'),
 'https://www.ebay.co.uk/str/rougetechnologies',
 json_array('Mens sport watches', 'womens analogue watches', 'quartz watch'),
 unixepoch(), unixepoch());