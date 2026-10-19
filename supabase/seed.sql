-- Phase 3 seed. Run after 0002_places_options.sql. Safe to re-run.
insert into districts (name) values ('Chatra'), ('Giridih'), ('Hazaribagh') on conflict (name) do nothing;

insert into programs (name, slug, sort_order) values
  ('Samvidhan Se Samman', 'samvidhan-se-samman', 1),
  ('NABARD LEDP', 'nabard-ledp', 2)
on conflict (name) do nothing;

insert into calendar_options (type, value, color, sort_order, protects_photos) values
  ('platform','Instagram',null,1,false), ('platform','Facebook',null,2,false), ('platform','WhatsApp',null,3,false),
  ('platform','YouTube',null,4,false),   ('platform','LinkedIn',null,5,false), ('platform','X',null,6,false),
  ('format','Reel',null,1,false), ('format','Carousel',null,2,false), ('format','Static post',null,3,false),
  ('format','Story',null,4,false), ('format','Short video',null,5,false), ('format','Article',null,6,false),
  ('pillar','Program impact',null,1,false), ('pillar','Beneficiary story',null,2,false), ('pillar','Awareness',null,3,false),
  ('pillar','Events',null,4,false), ('pillar','Behind the scenes',null,5,false), ('pillar','Policy/rights',null,6,false),
  ('goal','Awareness',null,1,false), ('goal','Engagement',null,2,false), ('goal','Donations',null,3,false),
  ('goal','Volunteers',null,4,false), ('goal','Advocacy',null,5,false),
  ('status','Idea','#7A8AA3',1,false), ('status','Planned','#3B7DD8',2,false), ('status','In progress','#D99A1E',3,false),
  ('status','Scheduled','#8B63D9',4,true), ('status','Published','#2E9E6B',5,true),
  ('stage','Not started','#7A8AA3',1,false), ('stage','Collecting assets','#D99A1E',2,false), ('stage','Design / Edit','#3B7DD8',3,false),
  ('stage','Review','#8B63D9',4,false), ('stage','Approved','#2E9E6B',5,false), ('stage','Ready to post','#1F7A4F',6,false),
  -- Problem themes staff tick on a field report. Starting list: the admin edits it in Settings.
  ('theme','Documents and identity',null,1,false), ('theme','Education',null,2,false), ('theme','Livelihood and self-help groups',null,3,false),
  ('theme','Health',null,4,false), ('theme','Discrimination and violence',null,5,false), ('theme','Land and housing',null,6,false),
  ('theme','Social security schemes',null,7,false), ('theme','Voting and civic participation',null,8,false), ('theme','Water and sanitation',null,9,false)
on conflict (type, value) do nothing;
