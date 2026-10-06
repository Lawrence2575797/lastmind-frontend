/* Psychology Career: A-level lessons, part two (schizophrenia treatments, stress, anorexia nervosa, and trauma). See lessons-psych.js. */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.cases = D.cases || []; D.lessons = D.lessons || {};
  var L = function (id, title, spec, sections) { D.lessons[id] = { id: id, title: title, spec: spec, track: 'psych', sections: sections }; };

  L('p-schiz-treat', 'Treating schizophrenia', 'AQA 7182 · Schizophrenia: treatments', [
    { h: 'Antipsychotic drugs', b: [
      '**Typical antipsychotics** such as **chlorpromazine** work as **dopamine antagonists**: they **block D2 receptors** in the brain, so the **excess dopamine** can no longer have its effect, and **hallucinations** and **delusions** fade. They also have a **calming (sedative) effect**. Side effects include dizziness, drowsiness, weight gain and stiffness; long-term use can cause **tardive dyskinesia** (uncontrolled movements of the face and tongue).',
      '**Atypical antipsychotics** such as **clozapine** act on **dopamine and serotonin** (and glutamate) receptors, and can help with **negative symptoms** too. They are used when other drugs fail. Clozapine can lower the white blood cell count (**agranulocytosis**), so patients need **regular blood tests**.',
      'Drugs are the **first-line treatment** and are effective at reducing positive symptoms, but they do not help everyone, and many people **stop taking them** because of side effects or because they feel well. Stopping often leads to **relapse**.',
    ] },
    { h: 'Psychological treatments', b: [
      { list: [
        '**Cognitive behavioural therapy (CBT)**: the patient and therapist look at **how they interpret** their experiences. It helps the patient to **make sense of** and **cope with** hallucinations and delusions (for example, testing a delusional belief against evidence, and **normalising** the experience), and to **reduce distress**. It does not remove the symptoms but makes them easier to live with. It is used **alongside** drugs.',
        '**Family therapy**: works with the whole family to **reduce expressed emotion** (criticism, hostility, over-involvement), to improve **communication** and **problem-solving**, to help the family understand the illness, and to **reduce the stress** that leads to relapse. It reduces relapse and hospital readmission and improves how well patients take their medication.',
        '**Token economies**: based on **operant conditioning**. Desirable behaviours (getting up, washing, taking medication) are **rewarded with tokens** (**secondary reinforcers**) which can be exchanged for **privileges** such as sweets or time off the ward. Used on **wards** to **shape behaviour**. Weakness: it changes behaviour in the institution but may **not carry over** to life outside, and it raises **ethical** questions about withholding things people need.',
      ] },
      { twist: 'Drugs treat the **biology** (dopamine). Therapy treats **stress, thinking and family climate**. A relapse that follows **stopping medicine** needs a different response from one that follows a **stressful home**, so find the cause first.' },
    ] },
  ]);

  L('p-stress-body', 'The body\'s response to stress', 'AQA 7182 · Stress: the physiology of stress', [
    { h: 'Two pathways', b: [
      'When the brain perceives a threat, the **hypothalamus** triggers two systems.',
      { list: [
        '**Sympathomedullary pathway (SAM)** for **acute (short-term)** stress. The hypothalamus activates the **sympathetic nervous system**, which signals the **adrenal medulla** to release **adrenaline** into the blood. Heart rate and breathing speed up, blood goes to the muscles, and digestion slows: the **fight or flight** response. Afterwards the **parasympathetic nervous system** calms the body down.',
        '**Hypothalamic-pituitary-adrenal axis (HPA)** for **chronic (long-term)** stress. The hypothalamus releases **CRH**, which makes the **pituitary gland** release **ACTH**, which makes the **adrenal cortex** release **cortisol**. Cortisol raises blood sugar for energy, but in the long run **suppresses the immune system** and raises blood pressure. A **negative feedback loop** normally switches it off.',
      ] },
    ] },
    { h: 'Stress and illness', b: [
      { list: [
        '**Immune system**: long-term high cortisol means **fewer immune cells** and a **weaker response**. **Kiecolt-Glaser** found that **carers** of people with dementia had **slower wound healing** than controls; **Marucha** found that students\' wounds healed more slowly during **exams**.',
        '**Cardiovascular disorders**: constant adrenaline and raised blood pressure damage the blood vessels, which increases the risk of **hypertension** and **coronary heart disease**.',
      ] },
      'Not everyone becomes ill: the effect of stress depends on how long it lasts and how the person copes with it. Much of the evidence is **correlational**, so it cannot prove stress is the cause.',
    ] },
  ]);

  L('p-stress-sources', 'Where stress comes from, and why people differ', 'AQA 7182 · Stress: sources of stress and individual differences', [
    { h: 'Sources of stress', b: [
      { list: [
        '**Life changes**: **Holmes and Rahe** produced the **Social Readjustment Rating Scale**, with 43 life events (such as the death of a spouse, divorce, moving house) each given a **life change unit (LCU)**. A high total over a year predicts illness. Weaknesses: it counts **positive and negative** events alike, and ignores how much **control** a person has.',
        '**Daily hassles**: **Kanner** found that everyday annoyances (arguments, money worries, traffic) were **better predictors** of stress and illness than major life events, and that **uplifts** can buffer them.',
        '**Workplace stress**: **workload** (too much to do in too little time) and **control** over one\'s work. **Johansson** compared **"finishers"** in a Swedish sawmill (high workload, repetitive, tied to the machine) with **cleaners**: the finishers had **higher adrenaline** and **more illness**. **Marmot\'s** Whitehall study found that civil servants with **low control** in their jobs had more heart disease than those with high control.',
      ] },
    ] },
    { h: 'Individual differences', b: [
      { list: [
        '**Type A personality** (**Friedman and Rosenman**): **competitive, time-pressured, impatient and hostile**. Type A is linked with **coronary heart disease**. **Type B** is relaxed and patient. **Type C** (**Temoshok**) is **cooperative, avoids conflict and suppresses emotion**, and has been linked to **cancer**.',
        '**Hardiness** (**Kobasa**): hardy people resist stress because they have the **three Cs**: **control** (they feel in charge of events), **commitment** (they are involved in what they do) and **challenge** (they see change as an opportunity, not a threat).',
      ] },
      { twist: 'A stressed person who feels **ill** is not always **depressed**. Look for the **cause** (workload, lack of control, a run of life events) and the **physical signs** (sleep, headaches, a racing heart), and whether the problem **improves when the stress is reduced**. In depression the **low mood** and **negative thinking** persist whatever is happening at work.' },
    ] },
  ]);

  L('p-stress-manage', 'Managing stress', 'AQA 7182 · Stress: managing and coping with stress', [
    { h: 'Physiological: drugs and biofeedback', b: [
      { list: [
        '**Benzodiazepines (BZs)**, such as diazepam, **slow the activity of the central nervous system** by enhancing the effect of **GABA**, a neurotransmitter that **quietens** neurons. They make the person feel **calm**. They are for **short-term** use only: with long use there are risks of **tolerance**, **dependence** and withdrawal.',
        '**Beta blockers** reduce the effects of **adrenaline and noradrenaline** on the heart and blood vessels, so the heart beats more slowly and blood pressure falls. They reduce **physical** symptoms but not the cause.',
        '**Biofeedback**: the patient is connected to a machine that **measures a physiological response** (such as heart rate or muscle tension) and displays it. They learn **relaxation** and see the readings change, so they gradually gain **control** over the response.',
      ] },
    ] },
    { h: 'Psychological: stress inoculation and hardiness training', b: [
      '**Stress inoculation training (Meichenbaum)** has **three phases**: **conceptualisation** (the patient learns to understand their stress and what causes it), **skills acquisition and rehearsal** (they learn coping skills such as **relaxation**, positive self-talk and problem-solving, and practise them), and **application and follow-through** (they use the skills in **real** stressful situations, starting with easier ones). It works best with people who are **motivated**, and it takes time.',
      '**Hardiness training** (Kobasa and Maddi) teaches the **three Cs**: to **focus on the stressful situation** and see what it is, to **reflect on how to deal with it**, and to **use the stress as a chance to grow**. It builds control, commitment and challenge.',
      '**Social support** helps in three ways: **emotional support** (a listening ear), **esteem support** (being valued) and **instrumental support** (practical help), with **informational support** too. It acts as a **buffer**, and may also lower the stress response directly.',
      'The best treatment depends on the **problem**: a drug can calm a crisis quickly, but **changing the situation** (more control, a lower workload) and **skills** deal with the cause.',
    ] },
  ]);

  L('p-eating', 'Anorexia nervosa: explanations', 'AQA 7182 · Eating behaviour: anorexia nervosa', [
    { h: 'What it is', b: [
      '**Anorexia nervosa** is an eating disorder in which a person **keeps their body weight very low** by **restricting food** (sometimes also by excessive exercise), because of an **intense fear of gaining weight** and a **distorted view of their body**. It is a mental illness with serious physical effects, and it most often starts in **adolescence**.',
    ] },
    { h: 'Biological explanations', b: [
      { list: [
        '**Genetic**: **twin studies** show a higher concordance in **MZ** than DZ twins. Anorexia is **polygenic**, and having a close relative with it raises the risk. Genes may affect traits such as **anxiety** and **perfectionism**.',
        '**Neural**: **serotonin** levels, which affect mood and appetite, differ in people with anorexia, and **dopamine** pathways involved in **reward** work differently. The person may not get the usual reward from food, or may feel anxious after eating.',
      ] },
    ] },
    { h: 'Psychological explanations', b: [
      { list: [
        '**Family systems theory** (**Minuchin**): the family functions as a system and anorexia is a **symptom of a faulty system**. Features include **enmeshment** (very close, no personal boundaries), **overprotectiveness**, **rigidity**, and **avoiding conflict** (so nothing is ever resolved). The child\'s illness takes the attention away from **parents\' problems** and gives the child a way to feel in **control**.',
        '**Social learning theory**: we learn behaviour by **observing and imitating** role models we **identify** with and by seeing them **rewarded**. Media images of **thin people** being admired lead to **imitation** of dieting. **Becker** found that disordered eating rose in Fiji after **television** was introduced.',
        '**Cognitive theory**: **distorted thinking**: the person has a **distorted perception of their body** (seeing themselves as fat when underweight), holds **irrational beliefs** ("if I eat I will lose control"), and thinks in **all-or-nothing** terms, with **perfectionism**.',
      ] },
      { twist: 'Anorexia can look like **OCD** (rigid food rituals, counting, fear) or **depression** (low mood, withdrawal). The key is what **drives** the behaviour: a **fear of weight gain**, a **distorted body image** and **restricting food to keep weight low** point to anorexia. In OCD the rituals aim to reduce **a wide range of anxieties** that are not about body weight.' },
    ] },
  ]);

  L('p-trauma', 'After trauma: when the past replays', 'AQA 7182 · Stress; Psychopathology (the case file gives the definition)', [
    { h: 'What the case file tells you', b: [
      'The specification does not name **post-traumatic stress disorder (PTSD)**, so a case file that features it **defines it** for you, as an exam would. In brief: a person was **exposed to a real traumatic event** and, for **more than a month** afterwards, has **intrusive re-experiencing** (**flashbacks** and **nightmares**), **avoidance** of reminders, **negative changes in mood and thinking**, and **hyperarousal** (always on guard, startled, unable to sleep).',
    ] },
    { h: 'Using what you do know', b: [
      { list: [
        '**Physiology**: threat set off the **SAM** and **HPA** responses. In PTSD, the body **stays** on alert, which is why the person is **jumpy**, sleeps badly and has a racing heart.',
        '**Conditioning**: the trauma links **cues** (a sound, a smell, a place) to **fear**, as in the **two-process model** of phobias. A car backfiring becomes a **conditioned stimulus** for terror. **Avoiding** the cue is **negatively reinforced**, so the fear lasts.',
        '**Cognition**: the person may hold **irrational beliefs** or **negative schemas** about themselves and the world ("it was my fault", "nowhere is safe") that CBT can **challenge**.',
      ] },
      { twist: 'A **flashback** is a **memory** of a real event, triggered by a **cue**, and the person usually knows it is from the past. A **hallucination** has **no trigger or source**, and is believed to be real. **Delusions** are **fixed false beliefs**, but the beliefs after trauma are about **real events**.' },
      'Treatments use the same ideas: **CBT** that challenges the beliefs and gradually reduces the avoidance, and the **calming** techniques from stress management. A drug such as an **SSRI** can help with the low mood and anxiety, but it does not remove the **memory**.',
    ] },
  ]);

})(typeof window !== 'undefined' ? window : globalThis);
