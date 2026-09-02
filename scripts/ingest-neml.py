import csv, io, os, re, sys
from datetime import datetime, timezone
import requests
import pdfplumber
from supabase import create_client

URL = os.getenv('NEML_URL', 'https://www.health.gov.ng/wp-content/uploads/2025/08/Final-NEML-Adult-8th-Edition.pdf')
EDITION = os.getenv('NEML_EDITION', '8th Edition 2024')
SUPABASE_URL = os.environ['SUPABASE_URL']
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

supa = create_client(SUPABASE_URL, SERVICE_KEY)
source = supa.table('drug_sources').upsert({
    'source_name': 'Nigeria Essential Medicines List',
    'source_type': 'neml',
    'source_version': EDITION,
    'source_url': URL,
    'retrieved_at': datetime.now(timezone.utc).isoformat(),
}, on_conflict='source_name,source_version').execute().data[0]

pdf = requests.get(URL, timeout=90, headers={'User-Agent':'RxScan-Nigeria/1.0'})
pdf.raise_for_status()
rows = []
with pdfplumber.open(io.BytesIO(pdf.content)) as doc:
    for page in doc.pages:
        tables = page.extract_tables() or []
        for table in tables:
            for row in table:
                if not row: continue
                cells = [re.sub(r'\s+', ' ', (c or '')).strip() for c in row]
                name = next((c for c in cells if c and len(c) > 2), None)
                if not name or name.lower() in {'medicine','medicines','drug','drugs','name','description'}: continue
                # Keep the original table row as evidence; do not invent a clinical mapping.
                rows.append({'medicine_name': name, 'edition': EDITION, 'source_id': source['id'], 'evidence': ' | '.join(cells)})

# Conservative de-duplication. Exact NEML rows are retained only once.
seen = set(); clean = []
for r in rows:
    key = (r['medicine_name'].lower(), r['edition'])
    if key not in seen:
        seen.add(key); clean.append(r)

if not clean:
    raise RuntimeError('NEML PDF was downloaded but no table rows were extracted; refusing to write an empty dataset.')

for i in range(0, len(clean), 500):
    supa.table('neml_memberships').upsert(clean[i:i+500]).execute()
print(f'Ingested {len(clean)} NEML rows from {URL} ({EDITION})')
