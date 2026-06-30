-- Public Trinidad & Tobago hospitals with Obstetrics & Gynaecology departments
-- Safe to run multiple times: INSERT OR IGNORE skips existing rows

INSERT OR IGNORE INTO institution (id, name, type) VALUES
  ('dfc84706-03f7-4c0d-9150-3eef91fe0205', 'Port of Spain General Hospital', 'hospital'),
  ('135d91b2-cf2b-4378-beca-73dc5c327bdc', 'San Fernando General Hospital', 'hospital'),
  ('4213e737-a142-4363-ae42-573687d50d48', 'Mt. Hope Women''s Hospital', 'hospital'),
  ('8068a07a-64cf-4163-84a4-09a96090046c', 'Eric Williams Medical Sciences Complex', 'hospital'),
  ('3e90a94f-fa94-4ca5-863a-f2ccf2bf35fd', 'Arima General Hospital', 'hospital'),
  ('ad218bbe-6683-479c-a207-1c731fe8702d', 'Sangre Grande Hospital', 'hospital'),
  ('8f07184b-0ece-403d-959f-f220ae207591', 'Point Fortin Hospital', 'hospital'),
  ('4de33890-205f-416a-b208-4981cecff667', 'Scarborough General Hospital', 'hospital');

INSERT OR IGNORE INTO department (id, institution_id, name) VALUES
  ('a2b0a59a-c2c4-4705-92fd-7ee6a3d51d07', 'dfc84706-03f7-4c0d-9150-3eef91fe0205', 'Obstetrics & Gynaecology'),
  ('0e4daf19-40cd-4ac4-881e-216d6f2dc84c', '135d91b2-cf2b-4378-beca-73dc5c327bdc', 'Obstetrics & Gynaecology'),
  ('e73dddeb-04ba-4137-a078-41668e0b3f8d', '4213e737-a142-4363-ae42-573687d50d48', 'Obstetrics & Gynaecology'),
  ('ab2a85fc-b794-4c44-aaea-5b2f47fd588e', '8068a07a-64cf-4163-84a4-09a96090046c', 'Obstetrics & Gynaecology'),
  ('5c9d7d9d-9e26-4cc4-8846-d18383169788', '3e90a94f-fa94-4ca5-863a-f2ccf2bf35fd', 'Obstetrics & Gynaecology'),
  ('3a184cba-076b-481f-a28d-4bcfbbcc34b7', 'ad218bbe-6683-479c-a207-1c731fe8702d', 'Obstetrics & Gynaecology'),
  ('5bc1c122-da75-4fc2-9f9e-f7a337308d1e', '8f07184b-0ece-403d-959f-f220ae207591', 'Obstetrics & Gynaecology'),
  ('ee0c7249-19ac-4a5f-9841-cf69bbc068eb', '4de33890-205f-416a-b208-4981cecff667', 'Obstetrics & Gynaecology');
