/* Doctor Career: more GCSE lessons (AQA 8461), for the Registrar and Consultant cases. */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.cases = D.cases || []; D.lessons = D.lessons || {};
  var L = function (id, title, spec, sections) { D.lessons[id] = { id: id, title: title, spec: spec, track: 'gcse', sections: sections }; };

  L('inherited', 'Inherited disorders: cystic fibrosis and polydactyly', 'AQA 8461 · 4.6.1.6 Genetic inheritance · 4.6.1.7 Inherited disorders', [
    { h: 'Genes, alleles and carriers', b: [
      'A **gene** is a section of DNA that codes for a protein. Different versions of the same gene are called **alleles**. You inherit **two alleles** of each gene, one from each parent. A **dominant** allele shows in the body even if only one copy is present. A **recessive** allele shows only if **both** copies are recessive.',
      'A person with one dominant and one recessive allele is a **carrier** of the recessive allele: they are healthy, but can pass it on. Two carriers can have a child with two recessive alleles.',
      { ex: 'Both parents are carriers (Cc). Each child has a **1 in 4** chance of cc (affected), **1 in 2** of Cc (a carrier) and **1 in 4** of CC (neither). A Punnett square shows this.' },
    ] },
    { h: 'Two inherited disorders', b: [
      { list: [
        '**Polydactyly** (having extra fingers or toes) is caused by a **dominant allele**. A child with the condition has at least one affected parent, or a new change in the allele.',
        '**Cystic fibrosis** (a disorder of **cell membranes**) is caused by a **recessive allele**. Healthy parents can have an affected child when both are carriers. In practice, the faulty membranes make mucus thick and sticky, which affects the lungs and digestion.',
      ] },
      'Because cystic fibrosis is **recessive**, there may be no one affected in earlier generations, which is why parents are often surprised.',
    ] },
    { h: 'Embryo screening and gene therapy', b: [
      'Embryos can be screened for inherited disorders. You should be able to make **informed judgements about the economic, social and ethical issues** involved. Embryo screening and gene therapy may **alleviate suffering**, but they raise ethical questions: which conditions to screen for, what happens to embryos not chosen, and cost.',
      { twist: 'A cough, wheeze and repeated chest infections in a young child can be asthma, allergies or ordinary infections. **Failure to gain weight, a family history and the result of a specific test** can point to a different cause altogether.' },
      { check: ['Two healthy parents have a child with a recessive condition. What are the chances for their next child?', '1 in 4 affected, 1 in 2 a carrier, 1 in 4 neither: each pregnancy starts again.'] },
    ] },
  ]);

  L('interactions', 'When illnesses interact', 'AQA 8461 · 4.2.2.5 Health issues', [
    { h: 'Health is physical and mental', b: [
      '**Health** is the state of **physical and mental well-being**. **Communicable** and **non-communicable** diseases are both major causes of ill health, and so are **diet, stress and life situations**.',
      'Different types of disease can **interact**:',
      { list: [
        '**Defects in the immune system** make a person **more likely to suffer infectious diseases**.',
        '**Viruses living in cells** can be the **trigger for cancers**.',
        '**Immune reactions** initially caused by a pathogen can trigger **allergies** such as skin rashes and asthma.',
        '**Severe physical ill health** can lead to **depression** and other mental illness.',
      ] },
      { twist: 'When a patient is run down, low and keeps getting infections, it is easy to see only the low mood, or only the infections. Ask which came first and what is driving the other: **a damaged immune system can cause repeated infections**, and **long illness can cause depression**. Often both are true.' },
      { check: ['Why does a damaged immune system lead to repeated infections?', 'The white blood cells that normally destroy pathogens are not working properly, so pathogens that would normally be dealt with get established.'] },
    ] },
  ]);

  L('gonorrhoea', 'Gonorrhoea', 'AQA 8461 · 4.3.1.3 Bacterial diseases', [
    { h: 'What it is', b: [
      '**Gonorrhoea** is a **sexually transmitted disease (STD)**. Its symptoms are a **thick yellow or green discharge** from the vagina or penis and **pain on urinating**. It is caused by a **bacterium**.',
      'It was easily treated with the antibiotic **penicillin** until **many resistant strains** appeared (see the lesson on resistant bacteria). That is why the specific antibiotic matters: the bacteria must be tested to see which antibiotic kills them.',
    ] },
    { h: 'Spread and control', b: [
      'It is **spread by sexual contact**. The spread can be controlled by **treatment with antibiotics** and by the use of a **barrier method of contraception**, such as a **condom**. Because partners can pass it back and forth, partners need to be treated as well.',
      { check: ['Why does a doctor test which antibiotic kills the bacteria rather than just giving penicillin?', 'Many strains are now resistant to penicillin. Specific bacteria need specific antibiotics.'] },
    ] },
  ]);

  L('salmonella', 'Salmonella food poisoning', 'AQA 8461 · 4.3.1.3 Bacterial diseases · 4.3.1.1 Communicable diseases', [
    { h: 'What it is', b: [
      '**Salmonella** food poisoning is a **bacterial** disease. It is spread by **bacteria ingested in food**, or by food **prepared in unhygienic conditions**. In the UK, **poultry are vaccinated against Salmonella** to control the spread.',
      'The **fever, abdominal cramps, vomiting and diarrhoea** are caused by the **bacteria and the toxins they secrete**.',
    ] },
    { h: 'Finding the source and stopping the spread', b: [
      'Because the pathogen is spread through food, the clue is **what people ate**. If everyone who is ill ate the same dish and those who did not eat it are well, the dish is the likely source. Ways to prevent or reduce spread include **cooking food thoroughly**, **hygienic preparation**, and **keeping people who are ill away from handling food**.',
      { twist: 'Vomiting and diarrhoea affecting a group can be a **virus** spreading from person to person, or even an **allergic reaction**. What separates them is **the timing, the shared meal, and the laboratory result**.' },
      { check: ['Why is it important to know what each ill person ate?', 'It helps identify the common source, so that it can be removed and the spread stopped.'] },
    ] },
  ]);

  L('dialysis', 'Kidney failure, dialysis and transplants', 'AQA 8461 · 4.5.3.3 Maintaining water and nitrogen balance (biology only) · 4.2.2.4 Treating organ failure', [
    { h: 'When the kidneys fail', b: [
      'The kidneys **filter the blood** and remove **urea, excess ions and water**. If they **fail**, urea and fluid build up in the body: the person feels tired and sick, may be breathless and swell up with fluid, and passes little urine.',
      'People with **kidney failure** may be treated by an **organ transplant** or by **kidney dialysis**.',
    ] },
    { h: 'How dialysis works', b: [
      'In **dialysis**, the patient\'s blood flows through a machine, next to a **partially permeable membrane**. On the other side is **dialysis fluid** with the same concentration of useful substances (such as glucose and ions) as normal blood but **no urea**. Urea and excess ions **diffuse** out of the blood into the fluid, while the useful substances are kept in the blood.',
    ] },
    { h: 'Dialysis or transplant?', b: [
      'You should be able to **evaluate** treating organ failure by a **mechanical device** or a **transplant**:',
      { list: [
        '**Dialysis**: available straight away, but needs **several hours, several times a week**, and does not do the kidney\'s job fully.',
        '**Transplant**: can restore normal life, but needs a **suitable donor**, an **operation**, and **drugs to stop the body\'s immune system rejecting** the new organ.',
      ] },
      { twist: 'Swollen ankles and breathlessness are classic signs of **heart failure**, but the same signs come from **kidney failure**, because fluid builds up. The clues are **how much urine** is passed and **what the blood urea shows**.' },
      { check: ['Why does a transplant patient need drugs to suppress the immune system?', 'The immune system recognises the new organ\'s surface molecules as foreign and would attack it, so rejection must be prevented.'] },
    ] },
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
