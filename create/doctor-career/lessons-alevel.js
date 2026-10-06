/*
 * Doctor Career: A-level lessons, written from scratch to what AQA A-level Biology (7402) requires. A-level questions often put you in an
 * unfamiliar context, so a case file may describe a condition the specification does not name; it always gives you the information you
 * need, and the reasoning it asks for is always the specification's.
 */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.cases = D.cases || []; D.lessons = D.lessons || {};
  var L = function (id, title, spec, sections) { D.lessons[id] = { id: id, title: title, spec: spec, track: 'alevel', sections: sections }; };

  L('a-glucose', 'Controlling blood glucose', 'AQA 7402 · 3.6.4.2 Control of blood glucose concentration', [
    { h: 'The three hormones', b: [
      'Blood glucose is kept steady by hormones acting mainly on the **liver** and other target cells. Three processes in the liver matter: **glycogenesis** (glucose to glycogen), **glycogenolysis** (glycogen to glucose) and **gluconeogenesis** (making glucose from non-carbohydrates such as glycerol and amino acids).',
      { list: [
        '**Insulin** (lowers glucose) attaches to **receptors on the surface of target cells**, increases the number of **channel proteins** for glucose in the surface membrane so more glucose is taken up, and **activates enzymes** that convert glucose to glycogen.',
        '**Glucagon** (raises glucose) attaches to **receptors on target cells**, and activates enzymes that convert **glycogen to glucose** and **glycerol and amino acids to glucose**.',
        '**Adrenaline** also attaches to receptors and activates the enzymes that convert **glycogen to glucose**.',
      ] },
    ] },
    { h: 'The second messenger model', b: [
      'Glucagon and adrenaline cannot enter their target cells. The hormone is the **first messenger**: it binds to a receptor in the cell surface membrane, which activates the enzyme **adenylate cyclase**. This converts ATP into **cyclic AMP (cAMP)**, the **second messenger**, inside the cell. cAMP activates **protein kinase**, which activates the enzymes that carry out the response.',
    ] },
    { h: 'Type I and Type II diabetes', b: [
      '**Type I** diabetes: the **beta cells of the pancreas do not make enough insulin** (usually because the body\'s own immune system destroys them). There is no insulin to bring glucose down. It is controlled by **insulin injections**, together with attention to diet.',
      '**Type II** diabetes: insulin is made, but the **target cells become less responsive to it** (their insulin receptors no longer respond properly), so glucose is not taken up. It is linked to **obesity, a diet high in sugar and fat, and lack of exercise**, and is controlled by **manipulating the diet**, sometimes with insulin or other drugs later.',
      'This is why an insulin measurement is so useful. **Low insulin with high glucose points to Type I; plenty of insulin with high glucose points to Type II.**',
      { twist: 'Age and weight do not decide it. An overweight middle-aged adult can have **Type I**, and a thin young person can have **Type II**. The **insulin response** and **how fast** the illness came on are the better clues.' },
      'The spec also asks you to evaluate the positions of **health advisers** (who stress diet and exercise) and the **food industry** (which sells sugary and fatty foods) in the rise of Type II.',
      { check: ['After a glucose drink, glucose stays high and insulin stays high. Which type, and what has failed?', 'Type II. Insulin is made, but target cells no longer respond properly to it, so glucose is not taken up.'] },
    ] },
  ]);

  L('a-kidney', 'The nephron and water potential', 'AQA 7402 · 3.6.4.3 Control of blood water potential', [
    { h: 'What the nephron does', b: [
      'The kidney\'s functional unit is the **nephron**. It forms urine in stages. **Ultrafiltration** at the glomerulus produces **glomerular filtrate** (small molecules such as water, glucose, ions and urea are forced out; large proteins stay in the blood). The **proximal convoluted tubule (PCT)** then **reabsorbs all the glucose** and much of the water, by **co-transport and active transport** with sodium ions. The **loop of Henle** maintains a **gradient of sodium ions in the medulla**. The **distal convoluted tubule and collecting duct** reabsorb **water** by osmosis.',
      'Because glucose is carried back into the blood by a **limited number of carrier proteins**, the PCT can only reabsorb so much. If the blood glucose is very high, **glucose appears in the urine**.',
    ] },
    { h: 'Osmoregulation and ADH', b: [
      '**Osmoregulation** is control of the **water potential of the blood**. If the blood water potential falls (blood too concentrated), **osmoreceptors in the hypothalamus** detect it. The hypothalamus signals the **posterior pituitary** to release **antidiuretic hormone (ADH)**.',
      'ADH makes the cells of the **distal convoluted tubule and collecting duct more permeable to water** (more water channels in the membranes), so **more water is reabsorbed** and a **small volume of concentrated urine** is made. If the blood water potential is high (too dilute), **less ADH** is released, less water is reabsorbed and **plenty of dilute urine** is made.',
      { twist: 'Thirst and large amounts of urine can come from **too much glucose in the blood** (the glucose carries water out with it) or from **too little ADH** (the kidneys cannot conserve water). **Test the urine for glucose** and see whether the urine is dilute or concentrated.' },
      { check: ['Why does a person with a very low ADH level pass large volumes of dilute urine?', 'Without ADH the collecting ducts stay relatively impermeable to water, so little water is reabsorbed and a large volume of dilute urine passes out.'] },
    ] },
  ]);

  L('a-immune', 'The immune response', 'AQA 7402 · 3.2.4 Cell recognition and the immune system', [
    { h: 'Antigens and the two responses', b: [
      'Every cell has **molecules on its surface**, including proteins, that identify it. An **antigen** is a molecule that causes an immune response. The immune system recognises **pathogens**, **cells from other organisms**, **abnormal body cells** and **toxins** by their antigens.',
      '**Phagocytosis**: a phagocyte engulfs a pathogen, and enzymes called **lysozymes** destroy it. Some phagocytes then display its antigens and are called **antigen-presenting cells**.',
      { list: [
        '**Cellular response**: **T lymphocytes** recognise the foreign antigen. **Helper T cells (TH cells)** stimulate **cytotoxic T cells (TC cells)**, **B cells** and **phagocytes**. Cytotoxic T cells kill infected or abnormal cells.',
        '**Humoral response**: **B lymphocytes** with the right receptor are selected (**clonal selection**) and divide to form **plasma cells**, which secrete **antibodies**, and **memory cells**.',
      ] },
      'An **antibody** is a protein with a specific **variable region** that fits one antigen. An **antigen-antibody complex** forms, and in bacteria this causes **agglutination** and **phagocytosis**.',
    ] },
    { h: 'Memory and vaccination', b: [
      'The first time you meet an antigen you make a **primary response**: slow, because few B cells match. **Memory cells** persist, so on a second exposure there is a faster, larger **secondary response**.',
      '**Vaccines** use antigens (from a dead, inactive or part of a pathogen) to produce memory cells without the disease. **Herd immunity** is when enough of a population is immune that the pathogen cannot spread easily, protecting those who are not. **Active immunity** is the body making its own antibodies; **passive immunity** is receiving antibodies made elsewhere (so no memory cells).',
      'Antigen **variability** (an antigen that keeps changing) makes disease prevention harder, because memory cells no longer match.',
      { check: ['Why is the secondary response faster than the primary response?', 'Memory cells already exist for that antigen, so many B and T cells are quickly stimulated and antibodies are produced in larger amounts, sooner.'] },
    ] },
  ]);

  L('a-hiv', 'HIV, AIDS, ELISA and monoclonal antibodies', 'AQA 7402 · 3.2.4 Cell recognition and the immune system', [
    { h: 'HIV and AIDS', b: [
      '**HIV** (the human immunodeficiency virus) is a virus with a protein coat, a lipid envelope and **genetic material (RNA)** with the enzyme **reverse transcriptase**. It attaches to a receptor on **helper T cells** and replicates inside them, destroying them.',
      'As helper T cells fall, the cellular and humoral responses are no longer coordinated, so the immune system cannot defend the body. **AIDS** is the stage where this causes **opportunistic infections** and some cancers.',
      '**Antibiotics are ineffective against viruses**: they target bacterial structures and processes (such as cell walls), and a virus has none of these, and replicates inside the host cell.',
    ] },
    { h: 'Antibodies as a tool: ELISA', b: [
      '**Monoclonal antibodies** are identical antibodies, all specific to one antigen. They can **carry a drug to a specific cell type**, and can be used in **medical diagnosis**.',
      'The **ELISA test** uses antibodies to detect a substance. In a test for HIV **antibodies**, the patient\'s serum is added to a surface coated with the HIV antigen. If the patient has made antibodies they bind. A second antibody linked to an **enzyme** then binds and, when the substrate is added, a **colour change** shows a positive result.',
      { twist: 'An HIV antibody test can be **negative very early on**, because the body has not yet made antibodies. A negative result soon after exposure does **not** rule out infection: a test that also looks for a viral antigen, or a repeat later, is needed. Meanwhile, early HIV illness looks like a **throat infection or flu**.' },
      { check: ['Why would an ELISA that detects antibodies be negative in the first days of an infection?', 'Because the B cells have not yet had time to produce enough antibodies (the primary response is slow), so there is nothing for the test to detect yet.'] },
    ] },
  ]);

  L('a-tumours', 'Tumours, cancer and gene expression', 'AQA 7402 · 3.2.2 Mitosis · 3.8.2.3 Gene expression and cancer', [
    { h: 'Uncontrolled division', b: [
      'Mitosis is a **controlled process**. **Uncontrolled cell division** can lead to **tumours** and **cancers**. Many cancer treatments are directed at **controlling the rate of cell division**.',
      '**Benign tumours** are usually **slow-growing, with a clear boundary**, and do not spread. **Malignant tumours** grow **faster**, have **no clear boundary**, **invade surrounding tissue**, and cells break off and form **secondary tumours** (metastasis) elsewhere. Malignant cells often have a **large, dark nucleus** and look unlike the normal cell.',
    ] },
    { h: 'The genes involved', b: [
      '**Proto-oncogenes** normally stimulate cell division. A mutation can turn one into an **oncogene**, permanently switched on, so cells divide constantly. **Tumour suppressor genes** normally **slow cell division** and cause **cell death** if DNA is damaged. If a **mutation** (or **abnormal methylation**) **inactivates** a tumour suppressor gene, division is not restrained.',
      'The **methylation** of DNA near a tumour suppressor gene can **switch it off**, and hypomethylation of oncogenes can **switch them on**, without any change in the base sequence.',
      '**Increased oestrogen concentrations** are involved in the development of **some breast cancers**: oestrogen stimulates transcription of genes that promote division in cells that have receptors for it.',
      { twist: 'A painful or red lump can look like an **infection**; a smooth lump can look **benign**. The tests that matter are about the **cells**: how fast they divide, whether they invade, and whether they depend on oestrogen.' },
      { check: ['How can a mutation in a tumour suppressor gene lead to a tumour?', 'The gene no longer slows cell division or triggers cell death, so cells with damaged DNA keep dividing without restraint.'] },
    ] },
  ]);

  L('a-gas', 'Gas exchange, ventilation and lung disease', 'AQA 7402 · 3.3.2 Gas exchange', [
    { h: 'The exchange surface', b: [
      'The human gas exchange system: **trachea**, **bronchi**, **bronchioles**, **alveoli** and **lungs**. The **alveolar epithelium** is **one cell thick** (short diffusion distance), has a **large surface area** (huge numbers of alveoli) and sits next to a dense network of **capillaries**, which keep a **steep concentration gradient** by carrying oxygen away.',
      '**Fick\'s law**: the rate of diffusion is proportional to **surface area x concentration difference / diffusion distance**. Anything that reduces the surface area, lengthens the diffusion distance or reduces the gradient slows gas exchange.',
    ] },
    { h: 'Ventilation', b: [
      'Breathing in: the **diaphragm contracts** and flattens, the **external intercostal muscles contract** to raise the ribs, so thoracic volume rises and pressure falls below atmospheric: air flows in. Breathing out is the reverse, with the **internal intercostals** and elastic recoil, so the two sets of intercostal muscles are **antagonistic**.',
      { eq: 'pulmonary ventilation rate = tidal volume x breathing rate' },
      '**Tidal volume** is the volume of air in one normal breath. If a lung stiffens so each breath is smaller, the person compensates with a **faster rate**.',
    ] },
    { h: 'Reading lung disease', b: [
      'The spec asks you to **interpret information** about how lung disease affects **gas exchange and/or ventilation**. So ask three questions:',
      { list: [
        '**Is the surface area reduced?** (alveolar walls broken down: fewer, larger air spaces.)',
        '**Is the diffusion distance longer?** (alveolar walls thickened or scarred, so oxygen crosses more slowly and the lung is stiffer, giving small breaths.)',
        '**Is ventilation reduced?** (airways narrowed or blocked, so less air gets in or out.)',
      ] },
      'You are also asked to interpret **data on risk factors** such as **smoking and pollution**, and to recognise the difference between a **correlation** and a **causal relationship**.',
      { check: ['A patient has small tidal volume and a fast breathing rate. What might be wrong with the lungs?', 'The lungs may have become stiffer, so each breath moves less air and the person breathes faster to keep the ventilation rate up.'] },
    ] },
  ]);

  L('a-genetics', 'Inheritance, pedigrees and screening', 'AQA 7402 · 3.7.1 Inheritance · 3.8.4.2 Differences in DNA used in screening', [
    { h: 'Reading a family tree', b: [
      'A **pedigree** shows who in a family has a condition. Work out the **mode of inheritance** with a few rules:',
      { list: [
        '**Unaffected parents with an affected child** means the condition is **recessive**, and both parents are **carriers** (heterozygous).',
        'If a recessive condition is **autosomal**, boys and girls are **equally** affected. If it is **X-linked**, it mostly affects **males**, and an affected girl would need an affected father.',
        'A **dominant** condition does not skip a generation: every affected person has an affected parent.',
      ] },
    ] },
    { h: 'Working out risk', b: [
      'Two **carriers** of an autosomal recessive allele (Aa x Aa): the chances for each child are **1 in 4 affected**, **1 in 2 a carrier**, **1 in 4 unaffected non-carrier**.',
      { ex: 'A healthy woman whose brother is affected: both her parents are carriers. Before testing, she has a **2 in 3** chance of being a carrier (she is unaffected, so the "aa" outcome is ruled out, leaving AA, Aa, Aa). If she is tested and found a carrier, the chance that her baby is affected depends entirely on her partner: **1 in 4 if he is a carrier, none if he is not**.' },
    ] },
    { h: 'Screening and counselling', b: [
      'DNA technology can **screen individuals for genetically determined conditions** (and drug responses or health risks). The information is used in **genetic counselling**, which explains the probabilities and the choices, and in **personalised medicine**.',
      'You should be able to **evaluate** screening: it may allow informed choices and early treatment, but it raises questions of **privacy, insurance, anxiety** and what choices are acceptable.',
      { twist: '"Nobody in our family has it" does not mean no risk: two healthy carriers can have an affected child. And a brother with a condition does not mean the baby **will** have it.' },
      { check: ['Two healthy parents have a child with a recessive condition. What can you say about the parents?', 'Both must be carriers (heterozygous). Each time they have a child there is a 1 in 4 chance it is affected.'] },
    ] },
  ]);

  L('a-mutation', 'Mutations and what they do to proteins', 'AQA 7402 · 3.8.1 Gene mutations · 3.4.3 Mutation and meiosis', [
    { h: 'Changes to the base sequence', b: [
      '**Gene mutations** may arise during DNA replication. They include the **addition, deletion, substitution, inversion and duplication of bases**. The nature of the change matters: a **substitution** may change one amino acid (or none, because the genetic code is **degenerate**), but an **addition or deletion** causes a **frameshift**, changing every codon after it, which usually produces a very different protein.',
      'A change in the **primary structure** of a protein can change its **tertiary structure**, and therefore its **function**, for example making an enzyme or a receptor not work.',
      'Mutations are **spontaneous**, but their rate is increased by **mutagenic agents** such as ionising radiation.',
    ] },
    { h: 'Chromosome mutations', b: ['Changes in chromosome **number** can arise by **non-disjunction** in meiosis, so a gamete has an extra or a missing chromosome.', { check: ['Why is a deletion of one base usually more harmful than a substitution?', 'A deletion shifts the reading frame, so every following codon is altered, while a substitution changes at most one codon.'] }] },
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
