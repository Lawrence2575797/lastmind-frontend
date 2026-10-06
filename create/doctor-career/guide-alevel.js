/* Doctor Career: the senior doctor's short notes for each A-level case (see guide-gcse.js). */
(function (root) {
  var D = root.DOCTOR = root.DOCTOR || {}; D.guide = D.guide || {};
  var G = function (id, o) { D.guide[id] = o; };

  G('a01', { file: 'Age, weight and family history all lean one way. Ask which findings reflect the mechanism rather than the type of person.',
    ask: 'Speed of onset, the direction his weight is moving, appetite and family history: separate the mechanism from the risk factors.',
    tests: 'A test showing the insulin response, and one asking why insulin might be missing, both speak to mechanism.',
    decide: 'Pick the facts that show whether insulin is absent or ignored. For treatment, match it to the step in glucose control that has failed.',
    ideas: [{ t: 'How insulin works', b: 'Insulin binds receptors on target cells, adds glucose channel proteins to their membranes and activates enzymes that make glycogen.', lesson: 'a-glucose' }, { t: 'Two different failures', b: 'Type I: beta cells make too little insulin. Type II: target cells respond poorly. Insulin levels after a glucose drink tell them apart.', lesson: 'a-glucose' }] });
  G('a02', { file: 'A sore throat that does not respond to the usual treatment: think about what that treatment actually targets.',
    ask: 'What has been tried, other symptoms, and any exposure that fits an infection other than a throat bug.',
    tests: 'Think about what each test detects (a bacterium, an antibody, an antigen) and how early in an infection it can first be positive.',
    decide: 'Pick evidence for a bacterial or a viral cause. For treatment, ask what antibiotics act on and what needs protecting.',
    ideas: [{ t: 'HIV and helper T cells', b: 'HIV replicates inside helper T cells and destroys them, so the immune response is no longer coordinated.', lesson: 'a-hiv' }, { t: 'When ELISA is positive', b: 'An ELISA for antibodies can be negative early on, before the primary response has made enough antibody to detect.', lesson: 'a-hiv' }] });
  G('a03', { file: 'A painful, red lump could be infection or a tumour. See which findings describe the behaviour of the cells, not only the symptoms.',
    ask: 'How it changed over time, how it responded to treatment, fever, hormone history and family history.',
    tests: 'Test the cells themselves: how fast they divide, whether they invade, and what drives them.',
    decide: 'Choose evidence about the cells, not about the discomfort. Treatment should target whatever is driving the growth.',
    ideas: [{ t: 'Uncontrolled division', b: 'Tumours arise when mitosis escapes control. Malignant tumours invade and spread; benign ones stay contained.', lesson: 'a-tumours' }, { t: 'Genes and hormones', b: 'Oncogenes, silenced tumour suppressor genes and raised oestrogen can all drive some cancers.', lesson: 'a-tumours' }] });
  G('a04', { file: 'Breathlessness has more than one mechanism. The information card describes three: match the patient\'s data to one of them.',
    ask: 'How breathing feels (in versus out), exposures over his working life, and what exercise does.',
    tests: 'Ventilation numbers and imaging answer different questions: how air moves, and what the alveoli look like.',
    decide: 'Pick facts that match one mechanism: reduced surface area, longer diffusion distance, or reduced ventilation.',
    ideas: [{ t: 'Three questions', b: 'Is the surface area reduced, the diffusion distance longer, or ventilation reduced? Each gives a different pattern of data.', lesson: 'a-gas' }, { t: 'Ventilation rate', b: 'Pulmonary ventilation rate = tidal volume x breathing rate. Small breaths can be offset by a faster rate.', lesson: 'a-gas' }] });
  G('a05', { file: 'Thirst and lots of urine can have more than one route. Check whether the file mentions sugar, sweat, or something else.',
    ask: 'Timing relative to the injury, the look of the urine, diet and sweating.',
    tests: 'One test rules sugar in or out. Another tells you whether the kidneys can concentrate urine when they need to.',
    decide: 'Choose facts that show where the control has failed: the sugar, the kidney, or the signal to the kidney.',
    ideas: [{ t: 'ADH', b: 'Osmoreceptors in the hypothalamus signal the posterior pituitary to release ADH, which makes the collecting ducts reabsorb more water.', lesson: 'a-kidney' }, { t: 'Glucose in the urine', b: 'The proximal tubule reabsorbs glucose using a limited number of carriers, so very high blood glucose spills into the urine.', lesson: 'a-kidney' }] });
  G('a06', { file: 'Healthy parents with affected children is a pattern. Draw the family tree in your head before you decide anything.',
    ask: 'Who is affected, their sex, and how the parents are related.',
    tests: 'Screening answers each person\'s status. A test on the unborn baby is rarely the first step.',
    decide: 'Choose facts that fix the mode of inheritance and each parent\'s status. Then explain the risk with numbers.',
    ideas: [{ t: 'Reading a pedigree', b: 'Unaffected parents with an affected child means a recessive allele with both parents carrying it. Girls and boys equally affected suggests autosomal.', lesson: 'a-genetics' }, { t: 'Working out risk', b: 'Two carriers: 1 in 4 chance of an affected child each time. If one parent is not a carrier, the child cannot be affected.', lesson: 'a-genetics' }] });
  G('a07', { file: 'A slow pulse can be normal or a warning. See what else in the file separates the two.',
    ask: 'What he was doing when it happened, how his pulse behaves with effort, and what is new.',
    tests: 'An ECG shows whether the parts of the heart are in step. Think about which part sets the rate and which part carries the signal on.',
    decide: 'Choose evidence about the signal\'s route. For treatment, think about which part of the system can be replaced.',
    ideas: [{ t: 'Conduction in the heart', b: 'The SAN starts each beat, the AVN delays it, and Purkyne tissue spreads it through the ventricles from the base upwards.', lesson: 'a-heart' }, { t: 'Output, stroke volume and rate', b: 'Cardiac output = stroke volume x heart rate. Fit people can have slow rates with a large stroke volume.', lesson: 'a-heart' }] });
  G('a08', { file: 'Everyone was vaccinated, and yet they are ill. Ask what a vaccine needs in order to work.',
    ask: 'How the illness started, symptoms, what is circulating locally, and who was protected.',
    tests: 'One test identifies the organism. Another compares it with what the vaccine was made against.',
    decide: 'Choose facts about the organism and how well the vaccine matches it. Treatment must fit the organism and protect others.',
    ideas: [{ t: 'Antigen variability', b: 'If a pathogen changes its surface antigens, memory cells and antibodies made earlier no longer match it.', lesson: 'a-vaccines' }, { t: 'Herd immunity', b: 'When enough people are immune the pathogen spreads poorly, which protects those who are not immune.', lesson: 'a-vaccines' }] });
  G('a09', { file: 'Cancer very young, with a gene involved, can mean inheritance or something acquired. The family history is only one part of it.',
    ask: 'Family history across generations, exposures, and age.',
    tests: 'Compare the gene in normal cells and in the tumour: in its sequence, and in how it is switched.',
    decide: 'Choose facts that separate a changed sequence from a silenced gene. Your advice to the family depends on which it is.',
    ideas: [{ t: 'Mutation or silencing', b: 'A tumour suppressor gene can be lost by mutation or silenced by methylation of its promoter, with no change in sequence.', lesson: 'a-epigenetics' }, { t: 'Methylation', b: 'Increased methylation stops transcription factors binding, switching the gene off.', lesson: 'a-epigenetics' }] });
  G('a10', { file: 'Confused, sweaty and smelling of alcohol: ask what else could explain each sign, given his medical history.',
    ask: 'Insulin, food, exercise and drinks: the inputs and outputs of blood glucose.',
    tests: 'One rapid test settles which direction his glucose has moved.',
    decide: 'Choose evidence for the direction of the change. Treatment must move glucose the right way, quickly.',
    ideas: [{ t: 'Glucagon and adrenaline', b: 'Both act on liver cells through cAMP to convert glycogen into glucose, raising blood glucose.', lesson: 'a-glucose' }, { t: 'Too much insulin', b: 'Insulin lowers glucose by adding channel proteins and making glycogen. Too much, or too little food and too much exercise, can push glucose too low.', lesson: 'a-glucose' }] });
})(typeof window !== 'undefined' ? window : globalThis);
