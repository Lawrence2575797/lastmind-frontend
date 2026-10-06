/*
 * Doctor Career: GCSE lessons. Each one is written from scratch and keeps to what AQA GCSE Biology (8461) asks for. Where a case needs
 * something outside the specification, the case file itself gives the information, as an exam would.
 */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.cases = D.cases || []; D.lessons = D.lessons || {};
  var L = function (id, title, spec, sections) { D.lessons[id] = { id: id, title: title, spec: spec, track: 'gcse', sections: sections }; };

  L('pathogens', 'Germs: what makes people ill', 'AQA 8461 · 4.3.1.1 Communicable diseases', [
    { h: 'Pathogens', b: [
      'A **pathogen** is a microorganism that causes disease. An illness you can catch from another person, an animal, food, water or the air is a **communicable** (infectious) disease.',
      'There are four kinds of pathogen: **viruses**, **bacteria**, **protists** and **fungi**. Each can be told apart by how it harms you and, importantly, by what kills it.',
      { list: [
        '**Viruses** live and reproduce **inside your cells**, damaging them.',
        '**Bacteria** reproduce rapidly inside the body and can make poisons called **toxins** that damage tissues and make you feel ill.',
        '**Protists** are single-celled organisms. Some, like the one that causes malaria, need another animal to carry them.',
        '**Fungi** mostly cause disease in plants, such as rose black spot.',
      ] },
    ] },
    { h: 'How they spread', b: [
      'Pathogens spread by **direct contact**, through **water**, or through the **air**. Cutting the spread means blocking the route: washing hands, cooking food properly, vaccinating, killing the creatures that carry the pathogen, or keeping an ill person away from others.',
      { check: ['Why can toxins make a bacterial infection worse than the number of bacteria suggests?', 'Because the poisons the bacteria make damage tissues and make you feel ill, as well as the harm the bacteria do by multiplying.'] },
    ] },
  ]);

  L('measles', 'Measles', 'AQA 8461 · 4.3.1.2 Viral diseases', [
    { h: 'What it is', b: [
      '**Measles** is a **viral** disease. Its symptoms are a **fever** and a **red skin rash**. It is a serious illness that can be fatal if complications arise.',
      'The virus is spread by **inhalation of droplets from sneezes and coughs**. That is why it passes so easily between children in a nursery or school, and why an ill child should be kept away from other people.',
    ] },
    { h: 'Why most children are vaccinated', b: [
      'Because measles can be fatal, most young children are **vaccinated** against it. If enough people are vaccinated, the virus finds it hard to spread at all. Babies who are too young to have the vaccine are protected only if the people around them are.',
      { twist: 'A rash and a fever do not always mean measles. Read the lesson on **allergies** as well: an allergic rash is a very different thing, and the order in which things happen is often the clue.' },
      { check: ['A child has a fever for three days and then a rash appears. Which illness fits that order better, measles or an allergic reaction?', 'Measles: it starts with a fever (and a cold-like illness), and the rash comes later. An allergic reaction usually has no fever.'] },
    ] },
  ]);

  L('allergy', 'Allergies and the immune system', 'AQA 8461 · 4.2.2.5 Health issues', [
    { h: 'When the immune system overreacts', b: [
      'Your immune system normally attacks pathogens. Sometimes it overreacts to something harmless, such as a food or pollen. This is an **allergy**. Skin rashes and asthma are two common signs.',
      'In short: **immune reactions initially caused by a pathogen can trigger allergies such as skin rashes and asthma**. So a rash can be the result of an infection (the body reacting to it) as well as a direct allergy to something eaten or touched.',
    ] },
    { h: 'Telling it apart', b: [
      'There is no single sign that settles it, so doctors weigh several things together: **was there a fever first**, **is the rash itchy**, **was there a clear trigger** (a new food, a new product), **is anyone else ill**, and **what do the tests show**.',
      { check: ['Name two things you would ask to help decide between an infection and an allergy.', 'For example: did a fever or cold come before the rash, is the rash itchy, did he eat or touch something new, is anyone around him ill.'] },
    ] },
    { h: 'Health issues', b: ['Different types of disease can **interact**. A defect in the immune system makes infections more likely; some viruses can trigger cancers; and severe long illness can lead to depression.'] },
  ]);

  L('vaccination', 'Vaccination and how your body defends itself', 'AQA 8461 · 4.3.1.6 Human defence systems · 4.3.1.7 Vaccination', [
    { h: 'Your defences', b: [
      'Before a pathogen even gets inside, the body has **non-specific defences**: the **skin**, the **nose**, the **trachea and bronchi**, and the **stomach**.',
      'If a pathogen gets in, **white blood cells** defend you in three ways: **phagocytosis** (engulfing and destroying it), **antibody production** (antibodies lock on to that pathogen) and **antitoxin production** (neutralising toxins).',
    ] },
    { h: 'How a vaccine works', b: [
      'A **vaccine** introduces small quantities of **dead or inactive** forms of a pathogen into the body. That stimulates the white blood cells to make **antibodies**, without making you ill.',
      'If the same pathogen ever gets in, the white blood cells respond **quickly** and make the correct antibodies, so you do not become ill.',
      'When a **large proportion** of the population is vaccinated, the pathogen spreads less, which protects those who cannot be vaccinated too.',
      { check: ['Why is a dead or inactive pathogen used in a vaccine?', 'It is still recognised by the white blood cells, which make antibodies, but it cannot cause the disease.'] },
    ] },
  ]);

  L('antibiotics', 'Antibiotics and painkillers', 'AQA 8461 · 4.3.1.8 Antibiotics and painkillers', [
    { h: 'What antibiotics do', b: [
      '**Antibiotics**, such as penicillin, cure bacterial disease by **killing the bacteria inside the body**. Specific bacteria must be treated with **specific antibiotics**.',
      '**Antibiotics cannot kill viruses.** It is difficult to develop drugs that kill viruses without damaging the body\'s own cells, because viruses live inside them.',
      { twist: 'A patient with a virus will often ask for antibiotics. Giving them does no good and does harm: it helps resistant bacteria to spread (see the lesson on **resistant bacteria**).' },
    ] },
    { h: 'Painkillers', b: ['**Painkillers** and similar medicines treat the **symptoms** of a disease (pain, fever) but they do **not** kill the pathogen.', { check: ['Paracetamol brings a fever down. Does that mean it has killed the virus?', 'No. It treats the symptom only. The body\'s immune system has to deal with the virus.'] }] },
  ]);

  L('malaria', 'Malaria', 'AQA 8461 · 4.3.1.5 Protist diseases', [
    { h: 'A disease carried by a mosquito', b: [
      'The pathogen that causes **malaria** is a **protist**. Its life cycle includes the **mosquito**, which carries it from person to person. An animal that carries a pathogen from one host to another is called a **vector**.',
      'Malaria causes **recurrent episodes of fever** and can be fatal. People often describe the fever coming in waves, with days of feeling better in between.',
    ] },
    { h: 'Controlling it', b: [
      'The spread of malaria is controlled by **preventing the mosquitoes from breeding** and by using **mosquito nets** to avoid being bitten.',
      'Because the pathogen is a protist, not a bacterium, **antibiotics are not the answer**. Doctors use specific anti-malarial medicines.',
      { twist: 'Flu, early HIV infection and malaria can all begin with a fever and aching. **Where has the patient been?** And **does the fever keep coming back?** Those two questions separate malaria from the rest.' },
      { check: ['Why is a mosquito net a good way to control malaria?', 'It stops the mosquito, the vector, from biting people and passing the protist on.'] },
    ] },
  ]);

  L('hiv', 'HIV and AIDS', 'AQA 8461 · 4.3.1.2 Viral diseases', [
    { h: 'What HIV does', b: [
      '**HIV** is a virus. It **initially causes a flu-like illness**. Unless it is successfully controlled with **antiretroviral drugs**, the virus attacks the body\'s **immune cells**.',
      '**Late stage HIV infection, or AIDS**, happens when the immune system is so badly damaged it can no longer deal with other infections or cancers.',
    ] },
    { h: 'How it spreads', b: [
      'HIV is spread by **sexual contact** or by the **exchange of body fluids**, such as blood, which happens when drug users **share needles**. It is not spread by coughs, sneezes or casual contact.',
      { twist: 'Because the first illness is flu-like, early HIV is easy to mistake for flu, glandular fever or a throat infection. A clue is the story of possible exposure; a test settles it.' },
      { check: ['Why does a damaged immune system lead to other infections and cancers?', 'Because the white blood cells that defend the body can no longer do their job, so pathogens and abnormal cells are not dealt with.'] },
    ] },
  ]);

  L('diabetes', 'Blood glucose and diabetes', 'AQA 8461 · 4.5.3.2 Control of blood glucose concentration', [
    { h: 'How blood glucose is controlled', b: [
      'The **pancreas** monitors and controls blood glucose concentration. If it is **too high**, the pancreas makes the hormone **insulin**, which causes glucose to move **from the blood into the cells**. In liver and muscle cells the excess is stored as **glycogen**.',
      'Higher tier: if blood glucose is **too low**, the pancreas makes **glucagon**, which causes glycogen to be converted into glucose and released into the blood. Insulin and glucagon work together in a **negative feedback** cycle.',
    ] },
    { h: 'Type 1 and Type 2', b: [
      '**Type 1 diabetes** is a disorder in which the pancreas **fails to produce enough insulin**. Blood glucose is uncontrolled and high. It is normally treated with **insulin injections**.',
      'In **Type 2 diabetes** the body cells **no longer respond to insulin** produced by the pancreas. It is commonly treated with a **carbohydrate-controlled diet and an exercise regime**. **Obesity is a risk factor** for Type 2.',
      { twist: 'Both types give thirst, tiredness and high blood glucose. Look at **how fast it came on**, **whether weight is falling**, **who it is**, and **what the insulin level does** after a sugary drink: in Type 1 insulin stays low; in Type 2 insulin is made but the cells ignore it.' },
      { check: ['A patient has high blood glucose and plenty of insulin in the blood. Which type is that more likely to be?', 'Type 2: insulin is being made, but the body cells no longer respond to it.'] },
    ] },
  ]);

  L('chd', 'Coronary heart disease', 'AQA 8461 · 4.2.2.4 Coronary heart disease · 4.2.2.2 The heart and blood vessels', [
    { h: 'What goes wrong', b: [
      'The **coronary arteries** carry blood to the heart muscle itself. In **coronary heart disease**, **layers of fatty material build up inside the coronary arteries**, narrowing them. That **reduces the flow of blood**, so the heart muscle gets **too little oxygen**, especially when it works hard, for example climbing stairs.',
    ] },
    { h: 'Treatments', b: [
      { list: [
        '**Stents** keep a coronary artery open.',
        '**Statins** reduce blood cholesterol, which slows down the rate at which fatty material is deposited.',
        'A **faulty valve** may fail to open fully or may leak: it can be replaced with a **biological or mechanical** valve.',
        'In **heart failure** a **donor heart** (or heart and lungs) can be transplanted, and an **artificial heart** may keep a patient alive while they wait.',
      ] },
      'Each treatment has benefits and risks: drugs are cheap and easy but may not be enough; a stent or valve is an operation; a transplant needs a donor and lifelong drugs.',
      { twist: 'Chest tightness can also come from a **faulty valve** or from the effects of the hormone **adrenaline** during stress. Ask **when** it happens (only with effort, and eased by rest?) and **what a test of the heart arteries shows**.' },
      { check: ['Why does a narrowed coronary artery cause pain on exercise but not at rest?', 'At rest the heart needs little oxygen and the narrowed artery can supply it. During exercise the heart needs more oxygen than the narrowed artery can deliver.'] },
    ] },
  ]);

  L('lifestyle', 'Lifestyle and non-communicable diseases', 'AQA 8461 · 4.2.2.6 The effect of lifestyle on some non-communicable diseases', [
    { h: 'Risk factors', b: [
      'A **non-communicable** disease cannot be passed from person to person. Many are linked to **risk factors**: things that **raise the chance** of getting the disease. They can be aspects of lifestyle or substances in the body or environment.',
      { list: [
        'Diet, smoking and lack of exercise raise the risk of **cardiovascular disease**.',
        '**Obesity** is a risk factor for **Type 2 diabetes**.',
        '**Alcohol** affects the **liver** and **brain function**.',
        '**Smoking** raises the risk of **lung disease** and **lung cancer**. Smoking and alcohol also harm **unborn babies**.',
        '**Carcinogens**, including **ionising radiation**, are risk factors for cancer.',
      ] },
      'A risk factor raises the chance but does not make the disease certain. For some risk factors a **causal mechanism** has been proven; for others it has not.',
      { check: ['If a scatter graph shows two things rising together, does it prove one causes the other?', 'No. It shows a **correlation**. A causal link needs a proven mechanism or controlled evidence.'] },
    ] },
  ]);

  L('hormones', 'Hormones, adrenaline and thyroxine', 'AQA 8461 · 4.5.3.1 Human endocrine system', [
    { h: 'Hormones', b: [
      'The **endocrine system** is made of **glands** that secrete chemicals called **hormones** directly into the bloodstream. The blood carries each hormone to a **target organ**. Compared with the nervous system, the effects are **slower but last longer**.',
      'The **pituitary gland** in the brain is the **master gland**: its hormones act on other glands. The glands you should be able to place on a diagram are the pituitary, pancreas, thyroid, adrenal glands, ovaries and testes.',
    ] },
    { h: 'Adrenaline and thyroxine', b: [
      '**Adrenaline** is made by the **adrenal glands** in times of fear or stress. It **increases the heart rate** and boosts the delivery of oxygen and glucose to the brain and muscles, preparing the body for **fight or flight**.',
      '**Thyroxine** from the **thyroid gland** stimulates the **basal metabolic rate**. It is important in growth and development.',
      { twist: 'A pounding heart can be adrenaline (a surge of fear or stress) and **not** heart disease. The difference is the trigger: adrenaline follows a **scare**, while disease-related chest tightness follows **effort**.' },
    ] },
  ]);

  L('cancer', 'Cancer: benign and malignant tumours', 'AQA 8461 · 4.2.2.7 Cancer', [
    { h: 'What cancer is', b: [
      '**Cancer** is the result of **changes in cells** that lead to **uncontrolled growth and division**.',
      { list: [
        '**Benign tumours** are growths of abnormal cells that are **contained in one area**, usually within a **membrane**. They **do not invade** other parts of the body.',
        '**Malignant tumour** cells are **cancers**. They **invade neighbouring tissues** and **spread to other parts of the body in the blood**, where they form **secondary tumours**.',
      ] },
      'Scientists have identified **lifestyle risk factors** for various cancers (see the lifestyle lesson) and **genetic risk factors** for some.',
      { twist: 'A lump is not the same as cancer. A benign tumour can be large, but it stays put. The test that matters is whether the cells are **contained** or **invading**.' },
      { check: ['What is the key difference between a benign and a malignant tumour?', 'A benign tumour stays contained and does not invade; a malignant tumour invades nearby tissue and spreads, forming secondary tumours.'] },
    ] },
  ]);

  L('resistance', 'Resistant bacteria and MRSA', 'AQA 8461 · 4.6.3.7 Resistant bacteria', [
    { h: 'How resistance arises', b: [
      'Bacteria reproduce very fast, so they can **evolve rapidly**. A **mutation** may make a bacterium **resistant** to an antibiotic. When the antibiotic is used, the resistant bacteria **survive and reproduce**, so the **resistant strain increases** in the population.',
      'The resistant strain then spreads because people are **not immune** to it and there is **no effective treatment**. **MRSA** is resistant to antibiotics.',
    ] },
    { h: 'What can be done', b: [
      { list: [
        'Doctors should **not prescribe antibiotics inappropriately**, such as for non-serious or **viral** infections.',
        'Patients should **complete their course** so all the bacteria are killed and none survive to mutate.',
        'The **agricultural use** of antibiotics should be restricted.',
      ] },
      'Developing new antibiotics is **costly and slow**, and is unlikely to keep up with new resistant strains.',
      { check: ['Why should patients finish a whole course of antibiotics?', 'So that all the bacteria are killed. Survivors could mutate and form resistant strains.'] },
    ] },
  ]);

  L('waterbalance', 'Water balance and the kidneys', 'AQA 8461 · 4.5.3.3 Maintaining water and nitrogen balance (biology only) · 4.1.3.2 Osmosis', [
    { h: 'Water moves by osmosis', b: [
      'Cells lose or gain water by **osmosis**: water moves across the cell membrane from a dilute solution to a more concentrated one. If body cells **lose or gain too much water** they **do not function efficiently**.',
      'Water leaves the body through the lungs (breathing out) and through the skin (sweat, along with ions and urea). There is **no control** over these losses. **Excess** water, ions and urea are removed by the **kidneys** in the **urine**.',
    ] },
    { h: 'What the kidneys do', b: [
      'The kidneys make urine by **filtering the blood** and then **selectively reabsorbing** useful substances: **glucose, some ions and water**. That is how they keep the body\'s **water balance**.',
      'Higher tier: the water level is controlled by the hormone **ADH**, released by the **pituitary gland** when the blood is too concentrated. It makes the kidney tubules **reabsorb more water**. This is **negative feedback**.',
      'People with **kidney failure** can be treated by an **organ transplant** or by **kidney dialysis**, a machine that does the filtering instead.',
      { twist: 'Too little water and **too much** water can both make a person confused and unwell. The question is whether the blood is **too concentrated** or **too dilute**.' },
      { check: ['If someone drinks far too much water, what happens to body cells?', 'The blood becomes too dilute, so water moves into the cells by osmosis, making them swell. That can seriously affect the brain.'] },
    ] },
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
