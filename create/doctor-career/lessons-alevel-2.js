/* Doctor Career: more A-level lessons (AQA 7402), for the Registrar and Consultant cases. */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.cases = D.cases || []; D.lessons = D.lessons || {};
  var L = function (id, title, spec, sections) { D.lessons[id] = { id: id, title: title, spec: spec, track: 'alevel', sections: sections }; };

  L('a-heart', 'The heart: cardiac cycle, conduction and control of heart rate', 'AQA 7402 · 3.3.4.1 Mass transport in animals · 3.6.1.3 Control of heart rate', [
    { h: 'How the heart beats', b: [
      'Heart muscle is **myogenic**: it contracts by itself without nerve impulses. A small patch of tissue, the **sinoatrial node (SAN)** in the right atrium, sets the rhythm. In order:',
      { list: [
        'The **SAN** sends out a **wave of electrical activity** across both **atria**, making them contract.',
        'A layer of non-conducting tissue stops the wave passing straight to the ventricles. Instead it reaches the **atrioventricular node (AVN)**.',
        'The **AVN** **delays** the signal, giving the atria time to empty and the ventricles time to fill.',
        'The wave then passes down the **bundle of His** and along the **Purkyne tissue** to the **base of the heart**, so the **ventricles contract from the bottom upwards**, pushing blood out of the top.',
      ] },
      { eq: 'cardiac output = stroke volume x heart rate' },
      '**Stroke volume** is the volume pumped per beat. A person whose heart pumps a larger volume each beat, such as a trained athlete, can have the **same cardiac output at a lower resting heart rate**.',
    ] },
    { h: 'Controlling heart rate', b: [
      'The **medulla** of the brain controls heart rate through the **autonomic nervous system**. **Chemoreceptors** in the carotid arteries and aorta detect a **fall in blood pH** (from more carbon dioxide). **Pressure receptors** detect changes in blood pressure. The **sympathetic** nerve **speeds up** the SAN; the **parasympathetic** (vagus) nerve **slows it**.',
    ] },
    { h: 'Reading an ECG', b: [
      'An **electrocardiogram (ECG)** records the heart\'s electrical activity. The spec expects you to **interpret ECG traces**. A small wave represents the **atria** firing, and a large spike the **ventricles** firing. In a healthy heart each atrial wave is followed, a short, constant interval later, by a ventricular spike. If the **atria and ventricles beat at different, unrelated rates**, the **signal is not getting through the AVN and Purkyne tissue**.',
      { twist: 'A slow pulse is **normal in a trained athlete**, but **fainting** and a pulse that **does not rise with effort** are not. The ECG shows whether the atria and ventricles are **in step**.' },
      { check: ['An ECG shows 75 atrial waves a minute and 36 ventricular spikes a minute, with no fixed relationship. What has failed?', 'Conduction from the atria to the ventricles (through the AVN, bundle of His and Purkyne tissue), so the ventricles are beating at their own slow rate.'] },
    ] },
  ]);

  L('a-vaccines', 'Vaccines, herd immunity and antigen variability', 'AQA 7402 · 3.2.4 Cell recognition and the immune system', [
    { h: 'Why vaccination works', b: [
      'A **vaccine** gives a harmless form of an **antigen**. The body responds as it would to an infection: B cells make **antibodies**, and **memory cells** are formed. On later exposure the **secondary response** is **faster and larger**, so the person does not become ill.',
      '**Active immunity** is the body making its own antibodies (after infection or vaccination) and **gives long-term protection**. **Passive immunity** is receiving antibodies made by someone else (across the placenta, in breast milk, or by injection); it is **immediate but short-lived**, and there are **no memory cells**.',
    ] },
    { h: 'Herd immunity', b: [
      '**Herd immunity** occurs when **a large enough proportion of a population is immune** that the pathogen cannot spread easily, which protects people who are not immune, such as the very young or those who cannot be vaccinated.',
    ] },
    { h: 'Antigen variability', b: [
      'Some pathogens, such as the influenza virus, **change their surface antigens** by **mutation**. After the change, **the antibodies and memory cells made against the old antigen no longer bind** to the new one, so a person who was vaccinated or infected before can become ill again. This is **antigen variability**, and it is why **a new vaccine is needed each year**.',
      'Vaccines for variable pathogens are therefore a **best match** rather than a complete protection, and herd immunity is weaker when a new strain appears.',
      { twist: '"They were all vaccinated, so it cannot be flu" feels logical but is wrong if the virus has **changed its antigens**. What matters is **whether the vaccine antigen matches the circulating virus**.' },
      { check: ['Why might a vaccinated person catch flu in a later year?', 'The virus\'s surface antigens have changed by mutation, so the memory cells and antibodies made after the earlier vaccine do not recognise the new strain.'] },
    ] },
  ]);

  L('a-epigenetics', 'Switching genes on and off: methylation and cancer', 'AQA 7402 · 3.8.2.1–3.8.2.3 Control of gene expression and cancer', [
    { h: 'Not all genes are always on', b: [
      'Almost every cell has the same DNA, but each cell type uses only some of its genes. **Transcription** is controlled by **transcription factors**, which move into the nucleus and bind to a **promoter** region near a gene to start transcription. The steroid hormone **oestrogen** can start transcription by this route.',
    ] },
    { h: 'Epigenetic control', b: [
      '**Epigenetics** means **heritable changes in gene function without changes to the base sequence of DNA**. Two ways:',
      { list: [
        '**Increased methylation** of DNA (adding methyl groups to cytosine bases near a gene) **prevents transcription factors from binding**, so the gene is switched **off**.',
        '**Decreased acetylation of histones** makes the DNA **more tightly wrapped**, so transcription factors cannot reach the gene, and it is switched off.',
      ] },
      'Epigenetic changes can be **affected by the environment** and are **relevant to the development and treatment of disease, especially cancer**.',
    ] },
    { h: 'Genes and cancer', b: [
      'A **tumour suppressor gene** normally slows cell division and causes cell death. It can be lost in **two ways**: a **mutation** of the gene (a change in the base sequence) or **abnormal methylation of its promoter**, which silences the gene **without changing its sequence**. Likewise an **oncogene** can be **over-activated** by **reduced methylation** or by mutation.',
      'This matters in treatment: a gene silenced by **methylation** is still intact, so a drug that **removes the silencing** could switch it back on, which cannot be done for a mutated gene.',
      { twist: 'A young person with cancer and **no family history** can have a **silenced** gene, not an inherited **mutation**. Testing the **sequence** and the **methylation** separates the two.' },
      { check: ['A tumour suppressor gene has the normal base sequence in a tumour but is not being expressed. What could explain it?', 'Abnormal (increased) methylation of its promoter region, which prevents transcription factors from binding and so switches the gene off.'] },
    ] },
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
