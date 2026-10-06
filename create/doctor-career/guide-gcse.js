/*
 * Doctor Career: the senior doctor's short notes for each GCSE case. They say what to notice and what each decision is really about,
 * and they never say which illness it is. `ideas` are two key facts from the lessons, trimmed to what matters for this decision.
 */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.guide = D.guide || {};
  var G = function (id, o) { D.guide[id] = o; };

  G('g01', { file: 'A rash with a fever could be an infection or an allergy. In the file, look at what came with the rash and when each thing started.',
    ask: 'Order and companions: which came first, the fever or the rash, and what else came along (cough, eyes, itch)? Ask who else is ill and what protection he has had.',
    tests: 'A good test splits your leading ideas. Ask which result would differ between an infection and an allergy. Records and swabs cost little; an X-ray exposes a child to radiation.',
    decide: 'Choose the facts that would be hard to explain if you had picked another illness. For what to do, think about who else could catch this, and what the medicine can and cannot kill.',
    ideas: [{ t: 'A rash: infection or allergy?', b: 'Both can cause a red rash. An infection often comes with a fever and spreads between people. An allergy follows a trigger and tends to itch.', lesson: 'allergy' }, { t: 'Why vaccines matter', b: 'A vaccine trains white blood cells to make antibodies in advance. If most people are vaccinated, babies too young for the jab are protected too.', lesson: 'vaccination' }] });
  G('g02', { file: 'A fever with chills has several possible causes. Notice where he has been and how the fever behaves, not only how high it is.',
    ask: 'Travel, the pattern of the fever (constant, or in waves?), what protected him from insect bites, and any other exposure. Each question tests a different idea.',
    tests: 'A blood film looks for a pathogen directly. A virus test and an HIV test each check one idea. Ask what each result would rule in or out.',
    decide: 'Pick facts that point to one cause only. For treatment, ask what kind of organism it is: the medicine must match it. Does it pass directly between people?',
    ideas: [{ t: 'Malaria in brief', b: 'A protist carried by mosquitoes causes fevers that return in waves. Nets and stopping the mosquitoes breeding control it, and antibiotics do not treat it.', lesson: 'malaria' }, { t: 'Flu-like illnesses', b: 'Early HIV infection also begins as a flu-like illness. What separates the causes is the exposure history and the right test.', lesson: 'hiv' }] });
  G('g03', { file: 'Thirst, weight and family history are all in the file. Which of them really separates one kind of diabetes from the other?',
    ask: 'Speed of onset, the direction his weight is moving, his appetite and family history are four different clues. Decide which ones separate the two types.',
    tests: 'A glucose reading confirms diabetes but not which kind. A test that shows what the body\'s insulin is doing is what separates them.',
    decide: 'Choose facts showing whether insulin is missing or being ignored. For treatment, match it to what has failed: replace the hormone, or make cells respond to it.',
    ideas: [{ t: 'Type 1 diabetes', b: 'The pancreas makes too little insulin, so blood glucose stays high. It is normally treated with insulin injections.', lesson: 'diabetes' }, { t: 'Type 2 diabetes', b: 'Insulin is made, but body cells no longer respond to it. Obesity is a risk factor, and diet and exercise are the usual treatments.', lesson: 'diabetes' }] });
  G('g04', { file: 'Chest tightness can come from the heart arteries, a valve, or stress. Look for what brings it on and what makes it go.',
    ask: 'When it starts, what eases it, and what happens when he is stressed but sitting still: these separate effort, rest and stress.',
    tests: 'Listen for the valves first. Then ask what shows the arteries themselves, or the heart working hard.',
    decide: 'Choose evidence that explains why it happens on effort. For treatment, ask which option opens a narrowed artery and which only treats symptoms.',
    ideas: [{ t: 'Coronary heart disease', b: 'Fatty material narrows the arteries feeding the heart, so the muscle lacks oxygen when it works harder. Stents open arteries; statins slow the build-up.', lesson: 'chd' }, { t: 'Adrenaline', b: 'Released in fear or stress, it speeds up the heart for fight or flight. A pounding heart does not always mean heart disease.', lesson: 'hormones' }] });
  G('g05', { file: 'A lump raises one question above all: is it staying put or spreading? See which findings in the file speak to that.',
    ask: 'How fast it grew, how it moves, and whether he has other lumps or symptoms: each speaks to "contained" or "spreading".',
    tests: 'Imaging and a biopsy look at the lump itself. A whole-body scan looks for spread, and is only worth the radiation if your suspicion calls for it.',
    decide: 'Pick the findings that say whether the cells are contained or invading. For treatment, match the response to how dangerous the tumour is.',
    ideas: [{ t: 'Benign or malignant?', b: 'A benign tumour stays contained, usually inside a membrane. A malignant one invades nearby tissue and spreads in the blood to form secondary tumours.', lesson: 'cancer' }, { t: 'Risk factors', b: 'Lifestyle and genes raise the chance of some cancers without making them certain.', lesson: 'lifestyle' }] });
  G('g06', { file: 'A wound is not healing on treatment. Ask what the treatment is meant to kill, and whether it is doing so.',
    ask: 'Was the treatment taken properly, for how long, and has anything changed on the ward? Find out whether the plan has failed or the diagnosis has.',
    tests: 'To choose an antibiotic you need to see the bacteria and see what kills them.',
    decide: 'Pick facts showing whether the drug or the diagnosis is the problem. For treatment, think about which antibiotic, and how to stop this reaching the next bed.',
    ideas: [{ t: 'Resistance', b: 'Mutations let some bacteria survive an antibiotic. They multiply and spread, and the drug stops working against them.', lesson: 'resistance' }, { t: 'Antibiotics', b: 'Antibiotics kill bacteria, not viruses, and specific bacteria need specific antibiotics.', lesson: 'antibiotics' }] });
  G('g07', { file: 'After a long run the obvious story is losing water. Check the file for what she took in as well as what she lost.',
    ask: 'How much she drank, what was in it, how hot it was, and how her body feels (weight, swelling): intake and output.',
    tests: 'Ask what the blood itself shows about water and salt: too concentrated, or too dilute?',
    decide: 'Choose evidence that shows which way her water balance went. For treatment, ask what each option does to the concentration of her blood.',
    ideas: [{ t: 'Osmosis in cells', b: 'Water moves into cells when the blood around them is too dilute, so they swell. If it is too concentrated, cells lose water.', lesson: 'waterbalance' }, { t: 'Kidneys and water', b: 'The kidneys filter blood and reabsorb water, glucose and some ions. Higher tier: ADH makes them reabsorb more water.', lesson: 'waterbalance' }] });
  G('g08', { file: 'Repeated chest problems can come from the lungs alone or from something wider. Look for symptoms outside the chest.',
    ask: 'Mucus, growth, stools, skin, triggers and family history: ask about the body beyond the lungs.',
    tests: 'One test checks a body-wide feature; another reads the gene. An allergy test only answers the allergy question.',
    decide: 'Choose facts that a lung-only explanation cannot cover. For advice, think about what the parents also need to know about inheritance.',
    ideas: [{ t: 'Recessive alleles', b: 'A recessive disorder shows only with two copies of the allele. Healthy carrier parents have a 1 in 4 chance of an affected child each time.', lesson: 'inherited' }, { t: 'Allergy and asthma', b: 'Allergies are immune overreactions that can show as rashes or asthma, usually with identifiable triggers.', lesson: 'allergy' }] });
  G('g09', { file: 'Low mood, weight loss and infections all appear. Work out which is causing which.',
    ask: 'His treatment history, the timeline (which came first), signs of diabetes, and his mood.',
    tests: 'Check the immune system directly, and rule diabetes in or out with one cheap test.',
    decide: 'Pick evidence that explains the infections and the weight loss. Treatment may need more than one part, because illnesses can interact.',
    ideas: [{ t: 'HIV and the immune system', b: 'HIV attacks immune cells. Untreated, late-stage infection (AIDS) leaves the body unable to fight other infections and some cancers.', lesson: 'hiv' }, { t: 'Illness and mood', b: 'Illnesses can interact: severe physical ill health can lead to depression.', lesson: 'interactions' }] });
  G('g10', { file: 'Note what has already been tried, and what the history says about how this could have been caught.',
    ask: 'Exposure, symptoms elsewhere in the body, and what he took and how much of it.',
    tests: 'To pick a medicine you need to know the organism and what kills it.',
    decide: 'Choose evidence for the organism and for why the first treatment failed. Treatment also involves other people.',
    ideas: [{ t: 'Gonorrhoea', b: 'A bacterial disease with a thick yellow-green discharge and pain on urinating, spread by sexual contact and controlled by antibiotics and condoms.', lesson: 'gonorrhoea' }, { t: 'Resistant strains', b: 'Many strains no longer respond to penicillin, so the right antibiotic has to be found by testing.', lesson: 'resistance' }] });
  G('g11', { file: 'When several people are ill the question becomes: what do they share? Look at timing and meals.',
    ask: 'Timing after the meal, who ate what, how the food was prepared, and who else is ill.',
    tests: 'One test finds the organism; another finds the link between the cases.',
    decide: 'Choose facts about timing and shared food. Treatment here covers the patient and everyone else who could be affected.',
    ideas: [{ t: 'Salmonella', b: 'Bacteria in food, or food prepared unhygienically, cause fever, cramps, vomiting and diarrhoea through the bacteria and their toxins.', lesson: 'salmonella' }, { t: 'Spreading disease', b: 'Pathogens spread by contact, water or air. Blocking the route stops the spread.', lesson: 'pathogens' }] });
  G('g12', { file: 'Swelling and breathlessness are shared by several organ problems. See what the file says about urine and the heart.',
    ask: 'Urine output, heart and lung symptoms and family history tell you which organ is failing.',
    tests: 'Look for what the kidneys should be removing, and check the heart separately.',
    decide: 'Pick facts that single out one organ. For treatment, weigh a machine against a transplant.',
    ideas: [{ t: 'What kidneys remove', b: 'Kidneys filter blood and remove urea, excess ions and water. When they fail, these build up in the body.', lesson: 'dialysis' }, { t: 'Dialysis or transplant', b: 'Dialysis is available at once but needs frequent sessions. A transplant needs a donor and drugs to stop rejection.', lesson: 'dialysis' }] });
})(typeof window !== 'undefined' ? window : globalThis);
