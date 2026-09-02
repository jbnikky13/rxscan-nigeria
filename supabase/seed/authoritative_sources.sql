-- Source registry only. Drug records are populated by the ingestion pipeline.
insert into public.drug_sources(source_name, source_type, source_version, source_url)
values
 ('NLM RxNorm','rxnorm','current','https://www.nlm.nih.gov/research/umls/rxnorm/'),
 ('Nigeria Essential Medicines List','neml','7th Edition 2020','https://extranet.who.int/cpcd/sites/default/files/public_file_repository/NGA_Nigeria-Essential-Medicine-List_2020.pdf'),
 ('NCBI PubMed','pubmed','E-utilities','https://www.ncbi.nlm.nih.gov/books/NBK25499/')
on conflict (source_name, source_version) do nothing;
