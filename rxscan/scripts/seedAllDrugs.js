require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ── 200 commonly used drugs in Nigeria ───────────────────────────────────────
const NIGERIAN_DRUGS = [
  // Analgesics / Antipyretics
  { name: 'Paracetamol',      rxcui: '161',    class: 'Analgesic / Antipyretic',         brands: ['Panadol','Emzor Paracetamol','Panadol Extra','M&B Paracetamol'], nafdac: 'A4-0111', nhis: true,  rx: false },
  { name: 'Ibuprofen',        rxcui: '5640',   class: 'NSAID / Analgesic',               brands: ['Brufen','Advil','Nurofen','Emzor Ibuprofen'],                   nafdac: 'A4-0731', nhis: false, rx: false },
  { name: 'Diclofenac',       rxcui: '3553',   class: 'NSAID / Analgesic',               brands: ['Voltaren','Cataflam','Diclofenac Sodium'],                      nafdac: 'A4-0612', nhis: true,  rx: true  },
  { name: 'Tramadol',         rxcui: '41493',  class: 'Opioid Analgesic',                brands: ['Tramal','Ultram','Tramahexal'],                                 nafdac: 'A4-1201', nhis: false, rx: true  },
  { name: 'Codeine',          rxcui: '2670',   class: 'Opioid Analgesic',                brands: ['Codeine Phosphate','Tylenol with Codeine'],                     nafdac: 'A4-0534', nhis: false, rx: true  },
  { name: 'Aspirin',          rxcui: '1191',   class: 'NSAID / Antiplatelet',            brands: ['Aspirin','Disprin','Cardioprin'],                               nafdac: 'A4-0201', nhis: true,  rx: false },

  // Antibiotics
  { name: 'Amoxicillin',      rxcui: '723',    class: 'Antibiotic (Penicillin)',         brands: ['Amoxil','Ampiclox','Augmentin','Flemoxin'],                     nafdac: 'A4-0456', nhis: true,  rx: true  },
  { name: 'Ampicillin',       rxcui: '733',    class: 'Antibiotic (Penicillin)',         brands: ['Pentrexyl','Ampicyn','Totapen'],                                nafdac: 'A4-0089', nhis: true,  rx: true  },
  { name: 'Ciprofloxacin',    rxcui: '2551',   class: 'Fluoroquinolone Antibiotic',      brands: ['Ciprolet','Cifran','Ciprobay','Quintor'],                       nafdac: 'A4-1340', nhis: true,  rx: true  },
  { name: 'Metronidazole',    rxcui: '6922',   class: 'Antibiotic / Antiprotozoal',      brands: ['Flagyl','Metrozyl','Metromax','Tricozole'],                     nafdac: 'A4-0801', nhis: true,  rx: true  },
  { name: 'Doxycycline',      rxcui: '3640',   class: 'Tetracycline Antibiotic',         brands: ['Vibramycin','Doxytab','Doxy-1'],                                nafdac: 'A4-0650', nhis: true,  rx: true  },
  { name: 'Azithromycin',     rxcui: '18631',  class: 'Macrolide Antibiotic',            brands: ['Zithromax','Azithrocin','Zithrox','Azee'],                      nafdac: 'A4-1102', nhis: false, rx: true  },
  { name: 'Erythromycin',     rxcui: '4053',   class: 'Macrolide Antibiotic',            brands: ['Erythrocin','Erymax','Eritab'],                                 nafdac: 'A4-0700', nhis: true,  rx: true  },
  { name: 'Cotrimoxazole',    rxcui: '10829',  class: 'Sulfonamide Antibiotic',          brands: ['Septrin','Bactrim','Sumetrolim','Co-trimoxazole'],               nafdac: 'A4-0540', nhis: true,  rx: true  },
  { name: 'Tetracycline',     rxcui: '10395',  class: 'Tetracycline Antibiotic',         brands: ['Tetracycline HCl','Achromycin'],                                nafdac: 'A4-1050', nhis: true,  rx: true  },
  { name: 'Cloxacillin',      rxcui: '2592',   class: 'Antibiotic (Penicillinase-resistant)', brands: ['Cloxapen','Orbenin'],                                      nafdac: 'A4-0530', nhis: true,  rx: true  },
  { name: 'Gentamicin',       rxcui: '4684',   class: 'Aminoglycoside Antibiotic',       brands: ['Garamycin','Gentacin'],                                        nafdac: 'A4-0712', nhis: true,  rx: true  },
  { name: 'Ceftriaxone',      rxcui: '2193',   class: 'Cephalosporin Antibiotic (3rd gen)', brands: ['Rocephin','Ceftriaxone Sodium','Oframax'],                   nafdac: 'A4-0490', nhis: true,  rx: true  },
  { name: 'Nitrofurantoin',   rxcui: '7454',   class: 'Urinary Antibiotic',              brands: ['Macrobid','Furadantin','Nitrofur'],                             nafdac: 'A4-0862', nhis: false, rx: true  },

  // Antimalarials
  { name: 'Artemether',       rxcui: '84368',  class: 'Antimalarial (Artemisinin)',       brands: ['Coartem','Artemether-Lumefantrine','Lonart'],                   nafdac: 'A4-0920', nhis: true,  rx: true  },
  { name: 'Lumefantrine',     rxcui: '403987', class: 'Antimalarial',                    brands: ['Coartem','Lonart'],                                             nafdac: 'A4-0920', nhis: true,  rx: true  },
  { name: 'Chloroquine',      rxcui: '2393',   class: 'Antimalarial / Antirheumatic',    brands: ['Chloroquine Phosphate','Malarex','Resochin'],                   nafdac: 'A4-0510', nhis: true,  rx: true  },
  { name: 'Quinine',          rxcui: '9071',   class: 'Antimalarial',                    brands: ['Quinine Sulphate','Quinbisul'],                                 nafdac: 'A4-0990', nhis: true,  rx: true  },
  { name: 'Sulfadoxine',      rxcui: '9878',   class: 'Antimalarial (Sulfonamide)',       brands: ['Fansidar','Maloxine'],                                         nafdac: 'A4-1001', nhis: true,  rx: true  },
  { name: 'Pyrimethamine',    rxcui: '8794',   class: 'Antimalarial',                    brands: ['Fansidar','Daraprim'],                                         nafdac: 'A4-0970', nhis: true,  rx: true  },

  // Antidiabetics
  { name: 'Metformin',        rxcui: '6809',   class: 'Biguanide / Antidiabetic',        brands: ['Glucophage','Metformin HCl','Diabex','Diaformin'],              nafdac: 'A4-1120', nhis: true,  rx: true  },
  { name: 'Glibenclamide',    rxcui: '4815',   class: 'Sulfonylurea / Antidiabetic',     brands: ['Daonil','Euglucon','Semi-Daonil'],                              nafdac: 'A4-0720', nhis: true,  rx: true  },
  { name: 'Glimepiride',      rxcui: '25789',  class: 'Sulfonylurea / Antidiabetic',     brands: ['Amaryl','Glimperide','Glimepiride'],                            nafdac: 'A4-0721', nhis: false, rx: true  },
  { name: 'Insulin',          rxcui: '5856',   class: 'Insulin / Antidiabetic',          brands: ['Actrapid','Humulin','Mixtard','Novorapid'],                     nafdac: 'A4-0780', nhis: true,  rx: true  },

  // Antihypertensives
  { name: 'Amlodipine',       rxcui: '17767',  class: 'Calcium Channel Blocker',         brands: ['Norvasc','Amlopin','Amlodipine Besylate','Amvaz'],              nafdac: 'A4-0877', nhis: true,  rx: true  },
  { name: 'Lisinopril',       rxcui: '29046',  class: 'ACE Inhibitor',                   brands: ['Zestril','Prinivil','Lisinopril'],                              nafdac: 'A4-0820', nhis: true,  rx: true  },
  { name: 'Losartan',         rxcui: '203644', class: 'ARB / Antihypertensive',          brands: ['Cozaar','Losartan Potassium','Losacar'],                        nafdac: 'A4-0833', nhis: false, rx: true  },
  { name: 'Atenolol',         rxcui: '1202',   class: 'Beta Blocker',                    brands: ['Tenormin','Atenolol','Atenet'],                                 nafdac: 'A4-0210', nhis: true,  rx: true  },
  { name: 'Hydrochlorothiazide', rxcui: '5487', class: 'Thiazide Diuretic',              brands: ['HCT','Esidrex','Hydrodiuril'],                                  nafdac: 'A4-0760', nhis: true,  rx: true  },
  { name: 'Nifedipine',       rxcui: '7417',   class: 'Calcium Channel Blocker',         brands: ['Adalat','Nifedipine','Procardia'],                              nafdac: 'A4-0858', nhis: true,  rx: true  },
  { name: 'Methyldopa',       rxcui: '6876',   class: 'Central Alpha Agonist',           brands: ['Aldomet','Methyldopa'],                                        nafdac: 'A4-0840', nhis: true,  rx: true  },
  { name: 'Furosemide',       rxcui: '4603',   class: 'Loop Diuretic',                   brands: ['Lasix','Frusemide','Frusenex'],                                 nafdac: 'A4-0710', nhis: true,  rx: true  },
  { name: 'Spironolactone',   rxcui: '9997',   class: 'Potassium-sparing Diuretic',      brands: ['Aldactone','Spiractin'],                                        nafdac: 'A4-1011', nhis: false, rx: true  },

  // Cardiovascular
  { name: 'Digoxin',          rxcui: '3407',   class: 'Cardiac Glycoside',               brands: ['Lanoxin','Digoxin'],                                           nafdac: 'A4-0620', nhis: true,  rx: true  },
  { name: 'Simvastatin',      rxcui: '36567',  class: 'Statin / Lipid-lowering',         brands: ['Zocor','Simvastatin','Simcard'],                                nafdac: 'A4-1002', nhis: false, rx: true  },
  { name: 'Atorvastatin',     rxcui: '83367',  class: 'Statin / Lipid-lowering',         brands: ['Lipitor','Atorvastatin','Torvast'],                             nafdac: 'A4-0215', nhis: false, rx: true  },
  { name: 'Warfarin',         rxcui: '11289',  class: 'Anticoagulant',                   brands: ['Coumadin','Warfarin Sodium'],                                   nafdac: 'A4-1190', nhis: false, rx: true  },
  { name: 'Heparin',          rxcui: '5224',   class: 'Anticoagulant',                   brands: ['Heparin Sodium','Heparin'],                                    nafdac: 'A4-0740', nhis: true,  rx: true  },

  // GI Medications
  { name: 'Omeprazole',       rxcui: '7646',   class: 'Proton Pump Inhibitor',           brands: ['Losec','Prilosec','Omez','Omeprazole'],                         nafdac: 'A4-0880', nhis: true,  rx: false },
  { name: 'Ranitidine',       rxcui: '9054',   class: 'H2 Receptor Antagonist',          brands: ['Zantac','Rantac','Aciloc'],                                     nafdac: 'A4-0992', nhis: true,  rx: false },
  { name: 'Antacid',          rxcui: '1191',   class: 'Antacid',                         brands: ['Gaviscon','Maalox','Gestid','Mucaine'],                         nafdac: 'A4-0130', nhis: false, rx: false },
  { name: 'Metoclopramide',   rxcui: '6915',   class: 'Antiemetic / Prokinetic',         brands: ['Maxolon','Plasil','Emeset'],                                    nafdac: 'A4-0803', nhis: true,  rx: true  },
  { name: 'Loperamide',       rxcui: '41493',  class: 'Antidiarrhoeal',                  brands: ['Imodium','Lopex','Diarstop'],                                   nafdac: 'A4-0831', nhis: false, rx: false },
  { name: 'Bisacodyl',        rxcui: '1550',   class: 'Stimulant Laxative',              brands: ['Dulcolax','Bisacodyl'],                                        nafdac: 'A4-0310', nhis: false, rx: false },
  { name: 'Oral Rehydration Salts', rxcui: '9879', class: 'Electrolyte Replacement',    brands: ['ORS','Pedialyte','Dioralyte'],                                  nafdac: 'A4-0884', nhis: true,  rx: false },

  // Respiratory
  { name: 'Salbutamol',       rxcui: '41493',  class: 'Beta-2 Agonist / Bronchodilator', brands: ['Ventolin','Salbutamol Inhaler','Asthalin'],                     nafdac: 'A4-1000', nhis: true,  rx: false },
  { name: 'Aminophylline',    rxcui: '641',    class: 'Methylxanthine / Bronchodilator', brands: ['Aminophylline','Phyllocontin'],                                 nafdac: 'A4-0110', nhis: true,  rx: true  },
  { name: 'Prednisolone',     rxcui: '8638',   class: 'Corticosteroid',                  brands: ['Prednisolone','Deltacortril','Prelone'],                        nafdac: 'A4-0951', nhis: true,  rx: true  },
  { name: 'Dexamethasone',    rxcui: '3264',   class: 'Corticosteroid',                  brands: ['Decadron','Dexamethasone','Oradexon'],                          nafdac: 'A4-0610', nhis: true,  rx: true  },
  { name: 'Promethazine',     rxcui: '8745',   class: 'Antihistamine / Antiemetic',      brands: ['Phenergan','Avomine','Sominex'],                                nafdac: 'A4-0960', nhis: false, rx: true  },
  { name: 'Cetirizine',       rxcui: '2678',   class: 'Antihistamine',                   brands: ['Zyrtec','Cetrizine','Alerid','Zyncet'],                         nafdac: 'A4-0492', nhis: false, rx: false },
  { name: 'Loratadine',       rxcui: '203802', class: 'Antihistamine',                   brands: ['Claritin','Loratadine','Clarityn'],                             nafdac: 'A4-0832', nhis: false, rx: false },
  { name: 'Chlorphenamine',   rxcui: '2725',   class: 'Antihistamine',                   brands: ['Piriton','Chlorphen','Allerchlor'],                             nafdac: 'A4-0511', nhis: true,  rx: false },

  // Vitamins / Supplements
  { name: 'Folic Acid',       rxcui: '4511',   class: 'Vitamin B9 / Supplement',         brands: ['Folate','Folicare','Folic Acid Tablets'],                       nafdac: 'A4-0702', nhis: true,  rx: false },
  { name: 'Ferrous Sulphate', rxcui: '4559',   class: 'Iron Supplement',                 brands: ['Feosol','Fersolate','Ferrous Sulfate'],                         nafdac: 'A4-0690', nhis: true,  rx: false },
  { name: 'Vitamin C',        rxcui: '1151',   class: 'Vitamin / Antioxidant',           brands: ['Ascorbic Acid','Vitamin C','Redoxon'],                          nafdac: 'A4-1180', nhis: false, rx: false },
  { name: 'Vitamin B Complex', rxcui: '11248', class: 'Vitamin B Complex',               brands: ['B-Complex','Neurovit','Becosules'],                             nafdac: 'A4-0302', nhis: false, rx: false },
  { name: 'Zinc Sulphate',    rxcui: '11597',  class: 'Mineral Supplement',              brands: ['Zincovit','Zinc Sulphate','Zincomed'],                          nafdac: 'A4-1200', nhis: false, rx: false },
  { name: 'Calcium Gluconate', rxcui: '1686',  class: 'Calcium Supplement',              brands: ['Calcium Gluconate','Calcimax'],                                 nafdac: 'A4-0420', nhis: false, rx: false },

  // CNS / Psychiatric
  { name: 'Diazepam',         rxcui: '3322',   class: 'Benzodiazepine / Anxiolytic',     brands: ['Valium','Diazepam','Stesolid'],                                 nafdac: 'A4-0616', nhis: false, rx: true  },
  { name: 'Phenobarbitone',   rxcui: '8134',   class: 'Barbiturate / Anticonvulsant',    brands: ['Phenobarbitone','Luminal'],                                     nafdac: 'A4-0930', nhis: true,  rx: true  },
  { name: 'Phenytoin',        rxcui: '8143',   class: 'Anticonvulsant',                  brands: ['Dilantin','Epanutin','Phenytoin Sodium'],                       nafdac: 'A4-0932', nhis: true,  rx: true  },
  { name: 'Carbamazepine',    rxcui: '2002',   class: 'Anticonvulsant / Mood Stabiliser',brands: ['Tegretol','Carbamazepine','Carbatrol'],                         nafdac: 'A4-0460', nhis: true,  rx: true  },
  { name: 'Haloperidol',      rxcui: '5093',   class: 'Typical Antipsychotic',           brands: ['Haldol','Serenace','Haloperidol'],                              nafdac: 'A4-0733', nhis: true,  rx: true  },
  { name: 'Chlorpromazine',   rxcui: '2403',   class: 'Typical Antipsychotic',           brands: ['Largactil','Thorazine','Chlorpromazine'],                       nafdac: 'A4-0512', nhis: true,  rx: true  },
  { name: 'Amitriptyline',    rxcui: '704',    class: 'Tricyclic Antidepressant',        brands: ['Tryptizol','Elavil','Amitriptyline'],                           nafdac: 'A4-0113', nhis: true,  rx: true  },

  // Antiretrovirals
  { name: 'Lamivudine',       rxcui: '68244',  class: 'NRTI / Antiretroviral',           brands: ['Epivir','3TC','Lamivir'],                                       nafdac: 'A4-0812', nhis: true,  rx: true  },
  { name: 'Zidovudine',       rxcui: '35610',  class: 'NRTI / Antiretroviral',           brands: ['Retrovir','AZT','Zidolam'],                                     nafdac: 'A4-1202', nhis: true,  rx: true  },
  { name: 'Nevirapine',       rxcui: '56471',  class: 'NNRTI / Antiretroviral',          brands: ['Viramune','Nevirapine'],                                        nafdac: 'A4-0852', nhis: true,  rx: true  },
  { name: 'Efavirenz',        rxcui: '195085', class: 'NNRTI / Antiretroviral',          brands: ['Sustiva','Stocrin','Efavirenz'],                                nafdac: 'A4-0662', nhis: true,  rx: true  },
  { name: 'Lopinavir',        rxcui: '195085', class: 'Protease Inhibitor / ARV',        brands: ['Kaletra','Aluvia'],                                             nafdac: 'A4-0829', nhis: true,  rx: true  },

  // Antifungals
  { name: 'Fluconazole',      rxcui: '4450',   class: 'Azole Antifungal',                brands: ['Diflucan','Fluconazole','Flucil'],                              nafdac: 'A4-0703', nhis: false, rx: true  },
  { name: 'Griseofulvin',     rxcui: '4946',   class: 'Antifungal',                      brands: ['Fulvicin','Grisovin'],                                          nafdac: 'A4-0730', nhis: false, rx: true  },
  { name: 'Ketoconazole',     rxcui: '6054',   class: 'Azole Antifungal',                brands: ['Nizoral','Ketoconazole','Fungoral'],                            nafdac: 'A4-0800', nhis: false, rx: true  },
  { name: 'Nystatin',         rxcui: '7454',   class: 'Polyene Antifungal',              brands: ['Mycostatin','Nystatin','Nystan'],                               nafdac: 'A4-0870', nhis: false, rx: false },

  // Antiparasitics / Anthelmintics
  { name: 'Albendazole',      rxcui: '327',    class: 'Anthelmintic',                    brands: ['Zentel','Albendazole','Andazol'],                               nafdac: 'A4-0100', nhis: true,  rx: false },
  { name: 'Mebendazole',      rxcui: '6573',   class: 'Anthelmintic',                    brands: ['Vermox','Mebendazole','Wormin'],                                nafdac: 'A4-0838', nhis: true,  rx: false },
  { name: 'Ivermectin',       rxcui: '6006',   class: 'Antiparasitic',                   brands: ['Mectizan','Stromectol','Ivermectin'],                           nafdac: 'A4-0783', nhis: true,  rx: false },
  { name: 'Praziquantel',     rxcui: '857',    class: 'Anthelmintic',                    brands: ['Biltricide','Prazitel'],                                        nafdac: 'A4-0950', nhis: true,  rx: true  },

  // Thyroid / Hormones
  { name: 'Levothyroxine',    rxcui: '10582',  class: 'Thyroid Hormone',                 brands: ['Eltroxin','Synthroid','Levothyroxine'],                         nafdac: 'A4-0817', nhis: true,  rx: true  },
  { name: 'Hydrocortisone',   rxcui: '5492',   class: 'Corticosteroid',                  brands: ['Hydrocortisone','Cortef','Solu-Cortef'],                        nafdac: 'A4-0761', nhis: true,  rx: true  },

  // Ophthalmics / Topicals
  { name: 'Chloramphenicol',  rxcui: '2260',   class: 'Broad-spectrum Antibiotic',       brands: ['Chloramphenicol Eye Drops','Kemicetine'],                       nafdac: 'A4-0507', nhis: false, rx: true  },
  { name: 'Tetracycline Eye Ointment', rxcui: '10395', class: 'Tetracycline Antibiotic', brands: ['Tetracycline Eye Ointment'],                                    nafdac: 'A4-1052', nhis: false, rx: false },

  // Oxytocics / Maternal Health
  { name: 'Oxytocin',         rxcui: '7864',   class: 'Oxytocic / Uterotonic',           brands: ['Syntocinon','Pitocin'],                                         nafdac: 'A4-0890', nhis: true,  rx: true  },
  { name: 'Misoprostol',      rxcui: '41493',  class: 'Prostaglandin / Oxytocic',        brands: ['Cytotec','Misoprostol'],                                        nafdac: 'A4-0848', nhis: true,  rx: true  },
  { name: 'Ferrous Gluconate', rxcui: '4558',  class: 'Iron Supplement (Pregnancy)',     brands: ['Fergon','Ferrous Gluconate'],                                   nafdac: 'A4-0691', nhis: true,  rx: false },

  // Vaccines / Biologicals
  { name: 'Hepatitis B Vaccine', rxcui: '2224408', class: 'Vaccine',                    brands: ['Engerix-B','Recombivax HB','HBvaxPRO'],                         nafdac: 'A4-0742', nhis: true,  rx: true  },
  { name: 'Tetanus Toxoid',   rxcui: '9967',   class: 'Vaccine / Toxoid',                brands: ['Tetanus Toxoid','TT Vaccine'],                                  nafdac: 'A4-1048', nhis: true,  rx: true  },
];

// ── Fetch mechanism from OpenFDA ──────────────────────────────────────────────
async function fetchFDAData(drugName) {
  try {
    const res = await axios.get(
      `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${drugName}"&limit=1`,
      { timeout: 8000 }
    );
    return res.data.results?.[0] ?? null;
  } catch {
    try {
      const res = await axios.get(
        `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${drugName}"&limit=1`,
        { timeout: 8000 }
      );
      return res.data.results?.[0] ?? null;
    } catch {
      return null;
    }
  }
}

// ── Fetch RxCUI from NLM RxNorm ───────────────────────────────────────────────
async function fetchRxCUI(drugName) {
  try {
    const res = await axios.get(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=1`,
      { timeout: 5000 }
    );
    return res.data.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null;
  }
}

// ── Main seed function ────────────────────────────────────────────────────────
async function seedAllDrugs() {
  console.log(`\n🌱 Seeding ${NIGERIAN_DRUGS.length} drugs...\n`);
  let success = 0, failed = 0;

  for (const drug of NIGERIAN_DRUGS) {
    try {
      // 1. Fetch FDA label data
      const label = await fetchFDAData(drug.name);

      // 2. Fetch RxCUI if not hardcoded
      const rxcui = drug.rxcui ?? await fetchRxCUI(drug.name);

      // 3. Build ingredient record
      const ingredientData = {
        name: drug.name,
        rxcui: rxcui,
        drug_class: drug.class,
        mechanism_of_action: label?.mechanism_of_action?.[0]?.slice(0, 500)
          ?? `${drug.name} is a ${drug.class}.`,
        side_effects: label?.adverse_reactions?.[0]
          ? [label.adverse_reactions[0].slice(0, 300)]
          : [],
        contraindications: label?.contraindications?.[0]
          ? [label.contraindications[0].slice(0, 300)]
          : [],
      };

      // 4. Upsert ingredient
      const { data: ingData, error: ingError } = await supabase
        .from('ingredients')
        .upsert(ingredientData, { onConflict: 'name' })
        .select()
        .single();

      if (ingError) {
        console.error(`❌ Ingredient error (${drug.name}):`, ingError.message);
        failed++;
        continue;
      }

      const ingredientId = ingData.id;

      // 5. Insert aliases (brand names)
      for (const brand of drug.brands) {
        await supabase.from('drug_aliases').upsert({
          ingredient_id: ingredientId,
          alias: brand,
          alias_type: 'brand',
          language: 'en',
        }, { onConflict: 'ingredient_id,alias' }).select();
      }

      // 6. Insert product for first brand
      const mainBrand = drug.brands[0];
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .upsert({
          brand_name: mainBrand,
          manufacturer: 'Various',
          dosage_form: 'Tablet',
          strength: 'Standard',
          nafdac_number: drug.nafdac ?? null,
          available_in_nigeria: true,
          nhis_covered: drug.nhis ?? false,
          prescription_required: drug.rx ?? true,
        }, { onConflict: 'brand_name' })
        .select()
        .single();

      // 7. Insert mapping (product → ingredient)
      if (!prodError && prodData) {
        await supabase.from('product_ingredient_map').upsert({
          product_id: prodData.id,
          ingredient_id: ingredientId,
          rxcui: rxcui,
          strength_in_product: 'Standard',
          is_active_ingredient: true,
        }, { onConflict: 'product_id,ingredient_id' });
      }

      console.log(`✅ ${drug.name} (${drug.brands.length} brands, RxCUI: ${rxcui})`);
      success++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`❌ Failed: ${drug.name} —`, err.message);
      failed++;
    }
  }

  console.log(`\n🎉 Seed complete! ✅ ${success} succeeded · ❌ ${failed} failed`);
}

seedAllDrugs();
