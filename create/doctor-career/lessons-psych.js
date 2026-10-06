/*
 * Psychology Career: A-level lessons, written from scratch to what AQA A-level Psychology (7182) asks for: Psychopathology, and the Schizophrenia,
 * Eating behaviour and Stress options. PTSD is not named by the specification, so the case file that features it gives the definition and the
 * lesson teaches the mechanisms the specification does cover (stress physiology, conditioning, cognition).
 */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.cases = D.cases || []; D.lessons = D.lessons || {};
  var L = function (id, title, spec, sections) { D.lessons[id] = { id: id, title: title, spec: spec, track: 'psych', sections: sections }; };

  L('p-abnormal', 'What counts as abnormal?', 'AQA 7182 · Psychopathology: definitions of abnormality', [
    { h: 'Four ways of drawing the line', b: [
      'There is no single test for "abnormal". Psychology uses four definitions, and each one catches some people and misses others.',
      { list: [
        '**Statistical infrequency**: behaviour that is **rare** compared with the population. Plot a trait such as IQ and most people sit near the middle; the far ends are rare. An IQ below 70 is an example, and is used in diagnosing intellectual disability.',
        '**Deviation from social norms**: behaviour that breaks the **unwritten rules** of a society, such as the way someone with antisocial personality disorder ignores other people\'s rights.',
        '**Failure to function adequately**: the person **cannot cope with the demands of everyday life**, such as working, feeding themselves or keeping a home. Rosenhan and Seligman listed signs: personal distress, maladaptive behaviour, irrationality and unpredictability, observer discomfort, and breaking social rules.',
        '**Deviation from ideal mental health**: the person lacks the qualities of good mental health that Jahoda listed, such as a **positive attitude to themselves**, **self-actualisation**, **resisting stress**, **autonomy**, **an accurate view of reality** and **coping with the environment**.',
      ] },
    ] },
    { h: 'Why none of them is enough on its own', b: [
      'Each definition has a weakness you must be able to use.',
      { list: [
        '**Statistical infrequency** counts rare but **desirable** traits (a very high IQ) as abnormal, and it ignores **common** problems: depression is frequent but still needs help. It also gives no reason to treat someone just because they are unusual.',
        '**Social norms** change with **time and culture**. Homosexuality was once classed as a disorder; hearing a dead relative speak is normal in some cultures and a symptom in others. It can also be misused to silence people who are simply different.',
        '**Failure to function** can describe someone who has made a **choice** (living very simply, for example), and it can miss someone who is seriously ill but still coping at work.',
        '**Ideal mental health** is **too demanding**: almost nobody meets every one of Jahoda\'s criteria, and the criteria are drawn from **Western, individualist** ideas of a good life.',
      ] },
      { twist: 'The same behaviour can be abnormal by one definition and normal by another. Always ask **who is deciding**, **in which culture**, and **whether the person is suffering or unable to cope**: that is what separates a difference from a disorder.' },
    ] },
  ]);

  L('p-phobias', 'Phobias: how they feel, how they are learned and how they are treated', 'AQA 7182 · Psychopathology: phobias', [
    { h: 'What a phobia is', b: [
      'A **phobia** is an anxiety disorder in which a person has an **irrational, intense fear** of an object or situation. The three types are **specific phobias** (animals, injury, situations such as lifts or heights), **social anxiety disorder** (social situations) and **agoraphobia** (public or open places, or places where escape would be hard).',
      'The specification lists the characteristics under three headings.',
      { list: [
        '**Behavioural**: **panic** (crying, screaming, freezing, running away), **avoidance** (staying away from the feared thing, which makes daily life harder) and **endurance** (staying with the feared thing but with high anxiety).',
        '**Emotional**: **anxiety and fear** that are out of proportion to the real danger, which are **unreasonable** and which the person cannot easily control.',
        '**Cognitive**: **selective attention** to the feared stimulus (it is hard to look away), **irrational beliefs** about it, and **cognitive distortions** that make it seem more threatening than it is.',
      ] },
    ] },
    { h: 'Learned fear: the two-process model', b: [
      'The **behavioural approach** says phobias are learned. **Mowrer** proposed two processes.',
      { list: [
        '**Acquisition by classical conditioning.** A neutral stimulus (a lift) is paired with an unconditioned stimulus that gives fear (being trapped and panicking). After this the lift alone produces fear: it has become a **conditioned stimulus**. Watson and Rayner\'s **Little Albert** was conditioned to fear a white rat in this way.',
        '**Maintenance by operant conditioning.** Avoiding the lift makes the fear drop. That drop in anxiety is a reward, so avoiding is **negatively reinforced**, and the person keeps avoiding. This stops them ever finding out that the lift is safe.',
      ] },
      'Weaknesses: some people with phobias recall **no frightening event**, and Seligman\'s idea of **biological preparedness** says we are ready to fear things that threatened our ancestors, such as snakes, more easily than things like cars.',
    ] },
    { h: 'Treatments', b: [
      '**Systematic desensitisation** (Wolpe) is built on the idea that you cannot be **relaxed and afraid at the same time** (**reciprocal inhibition**). Steps: the patient builds an **anxiety hierarchy** from least to most frightening; they learn **relaxation** techniques; they are then **exposed gradually**, step by step, staying relaxed before moving on. It can be done in real life or in imagination.',
      '**Flooding** goes straight to the most frightening situation, with **no gradual build-up and no chance to escape**, until the fear fades. Because the person cannot avoid it, they learn the feared thing is harmless, and the conditioned response is **extinguished**. It is quick and cheap but **very distressing**, so it needs **informed consent** and has a higher drop-out rate.',
      { ex: 'A man afraid of dogs might list: a photo of a dog, a video, a dog in the next room, a puppy on a lead, then stroking a calm dog. He relaxes at each step, and moves on only when the anxiety has gone.' },
    ] },
  ]);

  L('p-depression', 'Depression: what it looks like and how thinking keeps it going', 'AQA 7182 · Psychopathology: depression', [
    { h: 'Characteristics', b: [
      '**Depression** is a mood disorder. The specification lists characteristics in three groups.',
      { list: [
        '**Behavioural**: changes in **activity levels** (low energy, withdrawing from people and from things that were enjoyed; sometimes restless), **disruption to sleep and eating** (sleeping too much or too little, appetite going up or down), and sometimes **aggression** or **self-harm**.',
        '**Emotional**: **lowered mood** (feeling worthless or empty), **loss of enjoyment**, **anger** (even directed at other people), and **lowered self-esteem**.',
        '**Cognitive**: **poor concentration**, **dwelling on the negative** and paying more attention to bad events, and **absolutist thinking** (seeing things as all-or-nothing: "it is a total disaster").',
      ] },
    ] },
    { h: 'Beck and Ellis: it is how you interpret events', b: [
      'The **cognitive approach** says depression comes from **faulty thinking**, not just from events.',
      { list: [
        '**Beck** says depressed people hold **negative schemas**, learned early, which bias how they read new events. They show **cognitive biases** such as **overgeneralising**, **magnifying** bad events and focusing on the negative. Beck\'s **negative triad** is a negative view of **the self**, **the world** and **the future**.',
        '**Ellis\'s ABC model**: an **A**ctivating event, then **B**eliefs about it, then a **C**onsequence (an emotion or behaviour). Ellis said it is the **irrational beliefs** that cause the unhappy consequence, not the event. Typical irrational beliefs are **"musturbation"** (I **must** always do well), **"I-can\'t-stand-it-is"** (it is unbearable if I fail) and **utopianism** (life **must** be fair).',
      ] },
      { ex: 'Event: a friend does not reply to a message. Rational belief: "She is probably busy." Irrational belief: "Nobody likes me and nobody ever will." The event is the same; the feeling that follows is not.' },
    ] },
    { h: 'Cognitive behavioural therapy (CBT)', b: [
      '**CBT** aims to **identify the negative or irrational thoughts and change them**. Ellis\'s version, **rational emotive behaviour therapy**, adds **D** (**disputing** the irrational belief, by showing it is illogical, has no evidence or does not help) and **E** (the new, healthier **effect**). Beck\'s version helps the patient to treat thoughts as **hypotheses to test**, and encourages **behavioural activation**: doing enjoyable activities again, so the patient can check whether their predictions are true.',
      'CBT is effective for many patients and has few side effects. It works less well for **very severe** depression, where the patient may be unable to engage, and critics say it blames the **patient\'s thinking** and overlooks real problems in their life.',
      { twist: 'Depression and the **negative symptoms of schizophrenia** can look the same from the outside: both show **low motivation, flat expression and withdrawal**. The difference is in the **mood** and **thinking**: a depressed person feels worthless and sad and thinks negatively about themselves; hallucinations and delusions point towards schizophrenia.' },
    ] },
  ]);

  L('p-ocd', 'OCD: obsessions, compulsions and the brain', 'AQA 7182 · Psychopathology: OCD', [
    { h: 'Characteristics', b: [
      '**Obsessive-compulsive disorder (OCD)** is an anxiety-related disorder in which a person has **obsessions** (recurring, intrusive thoughts, images or urges, which cause anxiety) and **compulsions** (repetitive behaviours or mental acts carried out to reduce that anxiety).',
      { list: [
        '**Behavioural**: **compulsions** are **repetitive** and are carried out to **reduce anxiety**, which only works for a short time. People also **avoid** situations that trigger the obsessions.',
        '**Emotional**: **anxiety and distress** that are unpleasant and can be overwhelming, often with **depression** and with feelings of **guilt or disgust**.',
        '**Cognitive**: **obsessions** (recurring thoughts) and **strategies to manage them**, such as compulsive checking. Most people have **insight**: they know their obsessions are **excessive or irrational**.',
      ] },
      { twist: 'OCD can look like a **phobia of germs**. In a phobia, the person avoids the feared thing and feels better when it is gone. In OCD, the person is caught in a **cycle of obsession, anxiety and ritual**, and the rituals take up hours and spread to other themes.' },
    ] },
    { h: 'Biological explanations', b: [
      '**Genetic.** OCD runs in families. **Lewis** found that many OCD patients had a parent with OCD, and later work found people are **several times more likely** to have OCD if a close relative does. It is **polygenic**: no single gene causes it. Candidate genes include **COMT** (which helps regulate **dopamine**) and **SERT** (which affects the **serotonin** transporter, and so how much serotonin is available). Different genes may cause different forms of OCD.',
      '**Neural.** Parts of the brain are involved. The **orbitofrontal cortex** (which converts sensory information into thoughts and actions, and flags worries) is **overactive**. Normally the **caudate nucleus** filters out minor worries so we do not act on them; in OCD it seems to **fail to suppress** signals, so the worry circuit stays on. Low levels of **serotonin** are also linked to OCD.',
    ] },
    { h: 'Drug therapy: SSRIs', b: [
      '**Selective serotonin reuptake inhibitors (SSRIs)**, such as fluoxetine, work by **blocking the reabsorption of serotonin** at the synapse, so **more serotonin stays in the gap** and is available to the next neuron. They usually take **three to four months** to work, and are often combined with **CBT**. If an SSRI does not work, doctors may add or switch to another drug, such as a **tricyclic antidepressant** or an **SNRI**.',
      'Side effects can include nausea, headaches and sexual problems. SSRIs help most people at least a little, which supports the **serotonin** link, but they do not cure OCD, and many patients relapse if they stop.',
    ] },
  ]);

  L('p-schiz-class', 'Schizophrenia: symptoms, diagnosis and its problems', 'AQA 7182 · Schizophrenia: classification and diagnosis', [
    { h: 'Symptoms', b: [
      '**Schizophrenia** is a severe mental disorder in which a person loses touch with reality (**psychosis**). Its symptoms are grouped as **positive** (an **addition** to normal experience) and **negative** (a **loss** of normal function).',
      { list: [
        '**Hallucinations**: sensory experiences with **no external source**, most often **hearing voices**, and sometimes seeing or feeling things. They feel completely real.',
        '**Delusions**: **fixed, irrational beliefs** that the person holds despite evidence, such as **persecution** (being followed or poisoned), or **grandeur** (having special powers).',
        '**Negative symptoms**: **speech poverty** (very few words) and **avolition** (a lack of motivation to start or finish activities).',
      ] },
      'To diagnose schizophrenia, the classification systems (**ICD** and **DSM**) require a **cluster of symptoms**, such as two or more, **lasting at least a month**, with **at least one of them a positive symptom** in DSM.',
    ] },
    { h: 'Reliability and validity of diagnosis', b: [
      'A diagnosis is **reliable** if different doctors reach the same one, and **valid** if it measures what it claims to. Problems:',
      { list: [
        '**Co-morbidity**: patients often have another disorder too (depression, substance abuse, anxiety), which makes it hard to say which is the main one and calls the validity of a separate diagnosis into question.',
        '**Culture bias**: people of **Afro-Caribbean** origin in the UK are **diagnosed far more often** than white people. Behaviour that is normal in one culture (hearing the voices of dead relatives, religious experiences) may be wrongly read as symptoms.',
        '**Gender bias**: women may be **under-diagnosed**, because their symptoms may be interpreted differently, or because they respond to treatment earlier; men may be over-diagnosed.',
        '**Symptom overlap**: schizophrenia shares symptoms with other disorders, such as **bipolar disorder**, so it is easy to confuse them.',
        '**Reliability between doctors** is lower than it should be: studies have found that two psychiatrists given the same patients often reach **different diagnoses**.',
      ] },
      { twist: 'A **hallucination** is a perception without a source. A **flashback** in post-traumatic stress is a **memory** of a real event, set off by a cue. A person who hears **gunfire** only after a **real attack**, and recognises it as a memory, is not hallucinating. Always ask what **triggers** it, and whether the person understands what it is.' },
    ] },
  ]);

  L('p-schiz-bio', 'Schizophrenia: the biological explanations', 'AQA 7182 · Schizophrenia: biological explanations', [
    { h: 'Genes', b: [
      'Schizophrenia runs in families. **Gottesman** found that the risk is about **48% for an identical (MZ) twin** of a person with it, **17% for a non-identical (DZ) twin**, and about **46% for a child of two parents** with it, against **1%** in the general population. That the risk in MZ twins is not 100% shows that **genes alone cannot be the whole story**.',
      'There is no single schizophrenia gene: it is **polygenic**. Ripke and colleagues found over a hundred genes that raise the risk, many linked to **dopamine**. Some risk may also come from **new mutations**, such as those in the sperm of older fathers.',
    ] },
    { h: 'The dopamine hypothesis', b: [
      '**Dopamine** is a neurotransmitter. The original **dopamine hypothesis** said that schizophrenia is caused by **too much dopamine** in the **subcortex** (**hyperdopaminergia**). Too many **D2 receptors** on the receiving neurons in areas such as **Broca\'s area** (speech) could cause the **poverty of speech** and **hallucinations**.',
      'The **revised** hypothesis adds that **too little dopamine in the prefrontal cortex** (**hypodopaminergia**) is linked to **negative and cognitive symptoms**.',
      { list: [
        '**Evidence for it**: **amphetamine** raises dopamine and can cause psychotic symptoms in healthy people and make them worse in patients; **antipsychotic drugs** that **block dopamine** reduce symptoms.',
        '**Problem**: it is **hard to tell cause from effect** (does the dopamine cause the symptoms, or do the symptoms change dopamine?), and it cannot explain all symptoms.',
      ] },
    ] },
    { h: 'Neural correlates', b: [
      'A **neural correlate** is a brain feature that **goes with** a symptom, without proving it causes it. Brain scans show that people with **negative symptoms** have **reduced activity in the ventral striatum**, an area linked to **reward** and motivation, which fits **avolition**. People who hear voices show **changed activity in the superior temporal gyrus** (auditory processing) and in **Broca\'s area**, which fits **auditory hallucinations**.',
      { twist: 'The dopamine link means that **stopping antipsychotic drugs** can bring symptoms back: dopamine returns to its raised level. A **relapse** after stopping medication is a biological clue, not necessarily a sign that the family or the patient has done something wrong.' },
    ] },
  ]);

  L('p-schiz-psych', 'Schizophrenia: family, thinking and the interactionist view', 'AQA 7182 · Schizophrenia: psychological explanations', [
    { h: 'Family dysfunction', b: [
      'Early psychological theories blamed the family.',
      { list: [
        '**The schizophrenogenic mother** (Fromm-Reichmann): a **cold, rejecting and controlling** mother creates a family climate of **tension and secrecy** that leads to schizophrenia in the child.',
        '**Double-bind theory** (Bateson): a child often receives **contradictory messages** from a parent (for example, being told "come here" while the parent\'s body language says "go away") and **cannot comment on the contradiction or escape it**. This leads to confusion that Bateson said could become the thinking seen in schizophrenia.',
        '**Expressed emotion (EE)**: a family style with **verbal criticism, hostility and emotional over-involvement**. High EE is not thought to cause schizophrenia, but it is linked to **relapse**, because it creates **stress** for the person who already has the illness.',
      ] },
      'Evidence for family theories is mostly **retrospective** and from parents\' memories, and these theories can **blame families unfairly** at a time of great distress.',
    ] },
    { h: 'Cognitive explanations', b: [
      '**Frith** says schizophrenia involves **dysfunctional thought processing**. Two problems: **metarepresentation** (not being able to recognise **your own thoughts and actions as your own**, so your inner speech is experienced as a **voice from outside**, which explains hallucinations and delusions of control) and **central control** (not being able to **suppress automatic responses**, which explains **disorganised speech** and thoughts jumping from topic to topic).',
    ] },
    { h: 'The interactionist approach: diathesis and stress', b: [
      'The **diathesis-stress model** says that some people carry a **vulnerability** (the **diathesis**, such as a genetic risk) and become ill only when a **trigger** such as stress comes along. Early versions saw the vulnerability as one **"schizogene"**; more recent versions see it as **many genes**, and the **stress** as **trauma, family conflict, or cannabis use**.',
      { ex: 'Two cousins share a grandparent with schizophrenia. One goes through years of stress, heavy cannabis use and family conflict, and becomes ill. The other lives a calm life and does not. Vulnerability alone did not decide it; neither did stress alone.' },
      { twist: 'This is why a drug-induced episode and schizophrenia can look alike. If the symptoms **fade within days** after the drug is stopped, drugs were the cause. If they **continue for a month or more** with **a family history** and **earlier warning signs**, the vulnerability was already there.' },
    ] },
  ]);

})(typeof window !== 'undefined' ? window : globalThis);
