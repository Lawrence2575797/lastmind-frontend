/* Psychology Career: the senior psychologist's short notes for each case (see guide-gcse.js). They say what each decision is really about, never which disorder it is. */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.guide = D.guide || {};
  var G = function (id, o) { D.guide[id] = o; };

  G('p01', { file: 'Notice what she avoids and what she does about it. Then look at what else is normal in her life: mood, work, sleep, other habits.',
    ask: 'The start of the fear, what she thinks, how her body reacts, and what happens when she avoids it. Also ask about anything else she has to do or think repeatedly.',
    tests: 'A good assessment splits your leading ideas. Ask what would be different if this were a habit or a mood problem. A scan costs time and tells you nothing about a fear.',
    decide: 'Choose facts that point to one disorder and would be odd for the others. For treatment, ask how the fear was learned and what keeps it going.',
    ideas: [{ t: 'Learned in two steps', b: 'A frightening event links the lift to fear (classical conditioning). Avoiding the lift removes the fear, so avoiding is rewarded (operant conditioning), and the fear never fades.', lesson: 'p-phobias' }, { t: 'Gradual or sudden exposure', b: 'Systematic desensitisation climbs a fear hierarchy while relaxed. Flooding goes straight to the top, with no escape. Both extinguish the fear, but they ask very different things of the patient.', lesson: 'p-phobias' }] });
  G('p02', { file: 'Washing is the symptom everyone sees. Ask what is going on underneath it: what he thinks before, what he feels after, and how it has changed over time.',
    ask: 'The content of the thoughts, what he feels after the ritual, whether he sees it as reasonable, and whether the habits have spread.',
    tests: 'One assessment looks at obsessions and compulsions; another measures severity. Skin swabs only show what the washing has done.',
    decide: 'Pick facts that show a cycle of thoughts and rituals. For treatment, think about the brain chemistry and the circuits linked to this disorder.',
    ideas: [{ t: 'The cycle', b: 'Obsessions cause anxiety; compulsions reduce it briefly; the anxiety returns. Most people know their rituals are excessive.', lesson: 'p-ocd' }, { t: 'Serotonin and the brain', b: 'An overactive orbitofrontal cortex, a caudate nucleus that fails to filter worries and low serotonin are linked to OCD. SSRIs keep more serotonin in the synapse.', lesson: 'p-ocd' }] });
  G('p03', { file: 'A silent, withdrawn man could fit more than one picture. Look at what he says when he does speak, and at what is missing from the file.',
    ask: 'His mood in his own words, his view of himself and his future, his sleep and appetite, and anything unusual about his experiences.',
    tests: 'Check the mood and the thinking, and ask directly about voices and unusual beliefs. No scan or gene test can settle this.',
    decide: 'Choose evidence about mood and thinking, not just about how quiet he is. For treatment, ask what keeps his low mood going.',
    ideas: [{ t: 'Thinking keeps it going', b: 'Beck\'s negative triad (self, world, future) and Ellis\'s irrational beliefs are the thoughts CBT sets out to find and challenge.', lesson: 'p-depression' }, { t: 'Quiet is not always the same', b: 'Low motivation and little speech can come from low mood or from the negative symptoms of schizophrenia. The mood and the thinking tell them apart.', lesson: 'p-schiz-class' }] });
  G('p04', { file: 'Notice how he describes the voices: where they seem to come from, and whether he thinks they are his own. That matters more than how loud they are.',
    ask: 'What the voices say and where they seem to be, what he believes about the cause, whether he thinks he is unwell, and how long this has lasted.',
    tests: 'Interview about his experiences and the timeline, and ask about compulsions. A whole-body scan is not a psychology test, and it carries a risk.',
    decide: 'Pick the symptoms that make one diagnosis stand apart. For treatment, think about the neurotransmitter linked to these symptoms.',
    ideas: [{ t: 'Hallucinations and delusions', b: 'Positive symptoms are additions: voices with no source and fixed false beliefs. Negative symptoms are losses: avolition and speech poverty.', lesson: 'p-schiz-class' }, { t: 'Blocking dopamine', b: 'Typical antipsychotics such as chlorpromazine block D2 receptors, which reduces excess dopamine and the positive symptoms.', lesson: 'p-schiz-treat' }] });
  G('p05', { file: 'He is hearing and seeing things that are not there now. Ask what sets them off, whether he knows what they are, and when they began.',
    ask: 'What triggers it, whether he knows it is a memory, whether it happens without a trigger, what he avoids and how he sleeps.',
    tests: 'The key is the trigger and his understanding of the experience. A scan will not separate a memory from a hallucination.',
    decide: 'Choose facts about the link to a real event and the presence or absence of delusions. For treatment, use what you know about conditioning and the stress response.',
    ideas: [{ t: 'Flashback versus hallucination', b: 'A flashback is a memory of a real event, set off by a cue, and the person usually knows it is from the past. A hallucination has no source or trigger.', lesson: 'p-trauma' }, { t: 'A body stuck on alert', b: 'SAM and HPA responses switch on in a threat. If they stay on, the person is jumpy, sleeps badly and has a racing heart.', lesson: 'p-stress-body' }] });
  G('p06', { file: 'Symptoms that follow the calendar are a clue. Look at when they are worst, what has changed at work, and what the tests have already ruled out.',
    ask: 'When symptoms improve, how her workload and control have changed, how often she is ill, and her mood away from work.',
    tests: 'Compare work with leave, and measure workload and control. A heart scan was already made unnecessary by the normal ECG.',
    decide: 'Choose evidence about the source of the problem. For treatment, think about whether to calm her, give her skills, or remove the cause.',
    ideas: [{ t: 'Workload and control', b: 'Johansson found high workload and low control raised adrenaline and illness. Marmot found low control predicted heart disease.', lesson: 'p-stress-sources' }, { t: 'Cortisol and colds', b: 'Under chronic stress, the HPA axis releases cortisol, which suppresses the immune system, so colds are more frequent and wounds heal slowly.', lesson: 'p-stress-body' }] });
  G('p07', { file: 'There are two tempting causes in the file: the tablets and the family. Work out which fits the timing better.',
    ask: 'When he stopped, when the voices returned, why he stopped, and what home is like.',
    tests: 'Review the medication record and the family climate. A scan will not change what you do.',
    decide: 'Pick facts that fit one cause and not the other. For treatment, think about the reason he stopped.',
    ideas: [{ t: 'Dopamine returns', b: 'Antipsychotics block D2 receptors. When they are stopped, dopamine activity returns and positive symptoms can come back within weeks.', lesson: 'p-schiz-bio' }, { t: 'Expressed emotion', b: 'Criticism, hostility and over-involvement raise the risk of relapse through stress. Warm, calm families do not.', lesson: 'p-schiz-psych' }] });
  G('p08', { file: 'Notice what drives the behaviour, not just what it looks like. Fear, control and the family around her all matter.',
    ask: 'Her view of her body, what she fears, whether any rituals go beyond food, what her family is like, and where her ideas come from.',
    tests: 'Weight and BMI, and an interview about body image, tell you most. Family observation tells you about the system.',
    decide: 'Choose facts that separate this from an anxiety or mood problem. For treatment, match it to the explanation that fits her case.',
    ideas: [{ t: 'Three psychological explanations', b: 'Family systems theory (enmeshment, rigidity, avoiding conflict), social learning (copying role models) and cognitive theory (distorted body image, irrational beliefs).', lesson: 'p-eating' }, { t: 'Rituals about one thing', b: 'In OCD the rituals cover many fears. In anorexia they are tied to food and weight and to the fear of gaining it.', lesson: 'p-ocd' }] });
  G('p09', { file: 'A hospital note says one thing. Ask who decided, on what evidence, and in whose idea of normal.',
    ask: 'What the experience is like, how it affects his life, whether others share it, when it happens, and how his earlier diagnosis was made.',
    tests: 'A culturally informed interview and a check on functioning matter most. Detaining him would be a harm of its own.',
    decide: 'Choose facts about distress, functioning and context. For what to do, think about what each definition of abnormality would say.',
    ideas: [{ t: 'Four definitions, four answers', b: 'Statistical infrequency, social norms, failure to function and ideal mental health can disagree. Culture changes what counts as normal.', lesson: 'p-abnormal' }, { t: 'Culture bias in diagnosis', b: 'People of Afro-Caribbean origin in the UK are diagnosed with schizophrenia far more often than white people. Hearing a loved one can be normal in some cultures.', lesson: 'p-schiz-class' }] });
  G('p10', { file: 'Two easy explanations are in the file: the drug and the stress. Ask what would be different if either were the whole story.',
    ask: 'The timeline of cannabis, symptoms and withdrawal, family history, the build-up before the term, and what she believes.',
    tests: 'A drug screen now is the sharpest test. Interviews give the timeline. Scans do not diagnose this.',
    decide: 'Choose facts that show a vulnerability and a trigger. For treatment, use all the approaches that fit.',
    ideas: [{ t: 'Diathesis and stress', b: 'A vulnerability (genes, family history) plus a trigger (stress, trauma, cannabis) can together produce the illness when neither alone would.', lesson: 'p-schiz-psych' }, { t: 'Genes are not the whole story', b: 'Identical twins share the illness in about half of cases, so genes cannot be everything. Dopamine and the environment matter too.', lesson: 'p-schiz-bio' }] });
})(typeof window !== 'undefined' ? window : globalThis);
