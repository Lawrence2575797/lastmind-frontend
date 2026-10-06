// Reading lessons for the Criminal Lawyer Career: one short, hand-written lesson for each legal concept a case calls on.
// Nothing here calls the AI, so the lessons cost nothing and read the same every time. Each is kept small (three or four key terms at most)
// so it can be read in a couple of minutes beside the courtroom: what the rule is, the words that carry it, and one thing to think about.
// **double asterisks** mark a key term. This is the law of England and Wales, as taught for A Level Law.
(function () {
  const L = (window.LAW_CAREER = window.LAW_CAREER || {});
  const lessons = {};
  const add = (label, body, think) => { lessons[label] = { body, think }; };

  add('Burden and standard of proof', [
    'In a criminal trial the **burden of proof** sits with the prosecution. The defendant is presumed innocent, and does not have to prove anything, not even their own account.',
    'The **standard of proof** is high: the jury may convict only if they are **sure** of guilt, which used to be put as beyond reasonable doubt. A strong suspicion, or a story that seems more likely than not, is not enough.',
    'If the defendant raises something such as an alibi or self-defence, the burden does not move. It is still for the prosecution to disprove it to that same standard.',
  ], 'Which element of the charge is the Crown relying on the defendant to explain away, rather than proving for itself?');

  add('Theft: appropriation and dishonesty', [
    'Under section 1 of the Theft Act 1968 a person is guilty of theft if they **dishonestly appropriate** property **belonging to another** with the **intention of permanently depriving** the other of it. All of those parts must be proved.',
    '**Appropriation** is any assumption of the rights of an owner: taking, carrying off, using or selling the item. It does not matter whether the owner objected.',
    'Dishonesty is a question for the jury, who ask two things. First, what did the defendant actually know or believe about the facts at the time? Second, given that, would ordinary decent people say the conduct was dishonest?',
  ], 'If someone genuinely does not realise they are still holding something, which of those two questions does that answer?');

  add('Intention to permanently deprive', [
    'Theft needs the intention of **permanently depriving** the owner. Borrowing something and meaning to return it is not, on its own, theft.',
    'Section 6 of the Theft Act 1968 explains the limit: treating the item as your own to dispose of, regardless of the owner\'s rights, can count as an intention to deprive permanently, for example borrowing it for so long that its value is gone.',
    'The prosecution must prove what the defendant intended at the moment of the taking. Intention is judged from what they said, what they did and what they could easily have done.',
  ], 'What would a person who truly meant to keep the item have done differently from what this defendant did?');

  add('Theft: intention to permanently deprive', [
    'Theft needs the intention of **permanently depriving** the owner. Taking something to use for a while and then give back is not, on its own, theft.',
    'Section 6 of the Theft Act 1968 widens this a little: if someone treats the item as their own to dispose of, regardless of the owner\'s rights, that can amount to an intention to deprive permanently. Returning something in a state where all its value has gone is the usual example.',
    'The prosecution must prove the intention at the time of the taking. A later change of mind does not undo a theft, but it is evidence about what the defendant really intended.',
  ], 'What evidence would show whether the defendant meant to keep the property or give it back?');

  add('Theft: dishonesty', [
    'Dishonesty is the heart of most theft cases. It is a question of fact for the jury, tested in two steps following the Supreme Court in Ivey v Genting Casinos.',
    'Step one: work out the defendant\'s actual state of **knowledge or belief** about the facts. It does not have to be reasonable, only genuinely held. Step two: decide whether, on those beliefs, their conduct was dishonest by the **standards of ordinary decent people**.',
    'Section 2 of the Theft Act 1968 gives examples of beliefs that are not dishonest, such as believing you have a legal right to the property, or that the owner would consent if they knew.',
  ], 'Which belief did the defendant hold, and would ordinary people see it as honest?');

  add('Dishonesty', [
    'Dishonesty is decided by the jury in two steps. First, what did the defendant actually **know or believe** about the facts? Second, in the light of that, would ordinary decent people regard the conduct as **dishonest**?',
    'The defendant\'s belief only has to be genuine; it does not have to be sensible. But a belief that is wildly unlikely is harder for a jury to accept as genuine.',
    'The same test applies to theft, to fraud and to handling stolen goods, so it is worth knowing well.',
  ], 'What would the defendant have had to believe for their conduct to be honest, and is there any evidence for that belief?');

  add('Intention to steal', [
    'Burglary and attempted theft both depend on the defendant\'s intention. For theft the intention is to take property **dishonestly** and to deprive the owner of it **permanently**.',
    'An intention can be proved by what a person says, what they carry, what they do and the circumstances. Carrying the tools of the offence, or leaving at the first sign of discovery, points one way; an explanation that fits innocent behaviour points another.',
    'The prosecution must prove the intention existed at the relevant moment, such as when entering a building as a trespasser.',
  ], 'Which of the defendant\'s actions point to a plan to steal, and which fit an innocent reason?');

  add('Assault occasioning actual bodily harm', [
    'Section 47 of the Offences Against the Person Act 1861 covers an **assault** (or battery) that causes **actual bodily harm**. Actual bodily harm means any hurt or injury that is more than trivial, such as bruising or a cut.',
    'The prosecution must prove the assault or battery, and that it caused the harm. It does not have to prove that the defendant intended or foresaw any harm: it is enough that they intended or were reckless about the assault or battery itself.',
    'A battery is the application of unlawful force to another person, however slight. Self-defence and consent can make force lawful.',
  ], 'Which came first, the force or the injury, and can the Crown connect them?');

  add('Self-defence', [
    'A person may use **reasonable force** to defend themselves or others, or to prevent a crime. If they do, the force is lawful and they are not guilty of an offence of violence.',
    'The jury asks two questions. Did the defendant honestly believe force was needed? And was the force **reasonable in the circumstances as they believed them** to be? A person in a moment of danger cannot be expected to measure the force exactly.',
    'It is for the prosecution to disprove self-defence once it is raised. A mistaken belief can still support the defence if it was honestly held, though a drunken mistake cannot.',
  ], 'What did the defendant believe was about to happen, and was what they did in proportion to that?');

  add('Criminal damage and lawful excuse', [
    'Under the Criminal Damage Act 1971 it is an offence to **destroy or damage property belonging to another**, intending to damage it or being **reckless** as to whether it would be.',
    'Reckless means the defendant was aware of a risk that property would be damaged and it was unreasonable to take that risk.',
    'A defendant has a **lawful excuse** if they honestly believed the owner would have consented, or that the property needed protection and the damage was reasonable. The belief only has to be honestly held.',
  ], 'Who actually caused the damage, and what did they intend or foresee?');

  add('Voluntary intoxication', [
    'Becoming drunk or high on purpose is **voluntary intoxication**. It is never a full defence, but it can matter to offences that require a specific intention.',
    'For a **specific intent** offence (one that needs a particular aim, such as intending to cause serious harm) the jury may take intoxication into account when deciding whether the defendant really formed that intention.',
    'For a **basic intent** offence (where recklessness is enough) the voluntary intoxication does not help: getting drunk is itself treated as reckless.',
  ], 'Does this charge need a particular intention, or is recklessness enough?');

  add('Intoxication and intent', [
    'The law separates two kinds of offence. **Specific intent** offences, such as wounding with intent, require the defendant to have aimed at a particular result. **Basic intent** offences, such as unlawful wounding, can be committed recklessly.',
    'Voluntary intoxication may be evidence that a defendant did not form a specific intent, though a drunk person can still form an intention. It is never a defence to a basic intent offence.',
    'The jury looks at everything, including how drunk the defendant was and what they actually did, before deciding what was in their mind.',
  ], 'Is the question here about aim, or only about carelessness, and how does that change what intoxication can do?');

  add('Burglary: entering as a trespasser', [
    'Section 9 of the Theft Act 1968 creates two kinds of burglary. In the first the defendant **enters a building as a trespasser** with intent to steal, cause grievous bodily harm or do unlawful damage.',
    'A **trespasser** is someone who enters without permission and knows, or is reckless as to whether, they are entering without permission. Having permission to enter for one purpose does not cover entering to commit an offence.',
    'The intent must exist at the moment of entry. If the intention only arises after entering lawfully, the second form of burglary may be in issue instead.',
  ], 'Did the defendant have permission to be there, and what was in their mind as they went in?');

  add('Robbery', [
    'Section 8 of the Theft Act 1968: a person commits robbery if they **steal**, and immediately before or at the time of doing so, and in order to do so, they use **force** on any person or put or seek to put any person in fear of being then and there subjected to force.',
    'So robbery is theft plus force. Every part of theft must be proved first, including dishonesty and the intention to deprive permanently. Then the force must be linked to the stealing.',
    'The force can be slight. Whether it was force, and whether it was used in order to steal, are matters for the jury.',
  ], 'If the theft is not proved, what happens to the robbery charge?');

  add('Robbery: use of force', [
    'Robbery is theft plus **force**. The force, or the threat of it, must be used **immediately before or at the time of** the theft and **in order to** steal.',
    'Force does not have to be violent. A jerk of a handbag strap can be force, because the jury decides what counts. Fear of force is enough too, if the victim was put in fear of being then and there subjected to it.',
    'If force is used for a different reason, or after the theft is over, it is not robbery, though it may be another offence such as assault.',
  ], 'What was the force for, and when did it happen in relation to the taking?');

  add('Scientific and identification evidence', [
    'Evidence that identifies a defendant, such as a blood sample, a fingerprint or an eyewitness account, must be tested for reliability. The jury is warned to take care where a defendant\'s guilt depends on identification.',
    'Scientific evidence can be powerful but not perfect. The questions to ask are how the sample was gathered, how it was stored, what the match actually proves, and whether the match could have an innocent explanation.',
    'A match shows that someone was at a place or touched something. It does not by itself show when, or why.',
  ], 'What does the match prove, and what does it leave open?');

  add('Alibi and the burden of proof', [
    'An **alibi** is evidence that the defendant was somewhere else when the offence was committed. It is not a defence the defendant must prove: it is evidence that the prosecution must disprove.',
    'If the jury think an alibi might be true, they must acquit. Even if they conclude it is false, they must not assume guilt: people sometimes lie to support a true alibi out of panic.',
    'The defence must give notice of an alibi before trial, so that the prosecution can investigate it. A weak or untrue alibi can still be damaging if the jury see it as lying.',
  ], 'If the alibi witness is not believed, does that prove the defendant was at the scene?');

  add('Fraud by false representation', [
    'The Fraud Act 2006, section 2: a person commits fraud if they **dishonestly make a false representation**, intending to make a gain for themselves or another, or to cause loss to another or expose them to a risk of loss.',
    'A **representation** is false if it is untrue or misleading and the defendant knows that it is, or might be, untrue or misleading. It can be spoken, written or implied by conduct.',
    'The offence is complete when the false representation is made: it does not matter whether the victim was actually deceived or lost anything.',
  ], 'What did the defendant say or do, and what did they know about whether it was true?');

  add('Unlawful act manslaughter', [
    'Unlawful act manslaughter needs four things: an **unlawful act**, which is a criminal offence; the act is **dangerous** in that a sober and reasonable person would realise it risked some harm (not necessarily serious harm); the act **causes the death**; and the defendant had the mental element for the unlawful act itself.',
    'The defendant does not need to foresee death, or even serious harm. If someone dies as a result of a dangerous criminal act, that is enough.',
    'The prosecution must prove each part, including that the act, and not something else, caused the death.',
  ], 'What was the unlawful act, and was there a gap between it and the death that has to be explained?');

  add('Causation and the thin skull rule', [
    'To convict of a result such as death, the prosecution must prove the defendant\'s act **caused** it. The act need not be the only cause, but it must be an operating and substantial cause.',
    'The **thin skull rule** says defendants take their victims as they find them. If the victim had a weakness, such as a frail heart or a thin skull, the defendant cannot argue that a stronger person would have survived.',
    'This applies to physical weakness and also to things like religious beliefs that lead to a refusal of treatment.',
  ], 'Would the defendant\'s act have caused the same result if the victim had been healthy, and does that matter?');

  add('Causation: factual and legal', [
    'Causation has two parts. **Factual causation** is the \'but for\' test: but for the defendant\'s act, would the result have happened as and when it did?',
    '**Legal causation** asks whether the act was an operating and substantial cause, and whether anything later broke the chain. The defendant need not be the sole cause, but the contribution must be more than minimal.',
    'Both must be proved by the prosecution, to the criminal standard.',
  ], 'If the defendant had done nothing, what would have happened, and what else contributed?');

  add('Novus actus interveniens', [
    '**Novus actus interveniens** is Latin for a new intervening act. It is something that happens after the defendant\'s act and breaks the **chain of causation**, so the defendant is no longer legally responsible for the result.',
    'To break the chain the new event must be independent and sufficiently serious: a free, deliberate act by a third party, a very unusual natural event, or grossly negligent medical treatment.',
    'A reasonably foreseeable reaction, such as a victim fleeing and being injured, does not break the chain. Ordinary medical errors do not either, unless the treatment alone was the cause.',
  ], 'Was what happened next foreseeable, and was it independent of the defendant\'s act?');

  add('Handling stolen goods', [
    'Section 22 of the Theft Act 1968: a person handles stolen goods if, **knowing or believing** them to be stolen, they **dishonestly** receive them, or dishonestly undertake or assist in their retention, removal, disposal or realisation for another\'s benefit.',
    'The key issue is usually knowledge or belief. Suspicion alone is not enough; the prosecution must show the defendant knew or believed the goods were stolen.',
    'The Crown can use evidence such as a price far below value, no paperwork and the way the goods were sold to argue that a defendant must have known.',
  ], 'What would an honest buyer have asked or checked, and what did this defendant do instead?');

  add('Arson and criminal damage by fire', [
    'Under the Criminal Damage Act 1971 damaging property by fire is **arson**. It needs intent to damage property, or recklessness as to whether it would be damaged, and it is punished more severely than ordinary criminal damage.',
    'If the defendant intended to endanger life, or was reckless as to whether life would be endangered, the offence is **aggravated** and more serious again.',
    'The prosecution must prove the fire was started deliberately or recklessly, and that it was the defendant who started it. Accidental fires are not arson.',
  ], 'Was the fire started on purpose, and what links this defendant to starting it?');

  add('Proving who caused the damage', [
    'Identification is a separate step from proving that damage occurred. The prosecution must prove that **this defendant** caused it.',
    'It may rely on direct evidence, such as an eyewitness or footage, or on **circumstantial** evidence, such as being nearby, having a reason, or having traces on clothing.',
    'Where the evidence is circumstantial the jury must be sure that the only reasonable conclusion is guilt. Being at the scene, or having a motive, is not proof of what you did.',
  ], 'What is the strongest link between the defendant and the damage, and is there another explanation?');

  add('Murder: actus reus and mens rea', [
    'Murder is the **unlawful killing** of a human being under the King\'s Peace with **malice aforethought**. That is the **actus reus**, the guilty act, together with the **mens rea**, the guilty mind.',
    'The actus reus is an unlawful act or omission that causes the death. The mens rea is an **intention to kill or to cause grievous bodily harm**, meaning really serious harm.',
    'The prosecution must prove both together. Without the intention, an unlawful killing may be manslaughter instead.',
  ], 'Has the Crown proved what the defendant intended, or only that they caused the death?');

  add('Murder: intention', [
    'The mental element for murder is an intention to **kill or to cause really serious harm**. Intention is not the same as motive or desire.',
    '**Direct intention** is where the result is the defendant\'s aim or purpose. **Oblique intention** is where the result is not the aim but is a virtually certain consequence of what they did, and they knew it was virtually certain. The jury may find intention from that.',
    'It is for the jury to decide, looking at all the evidence about what the defendant did and said.',
  ], 'What was the defendant\'s aim, and did they know what was virtually certain to follow?');

  add('Loss of control and qualifying triggers', [
    'Loss of control is a partial defence to murder under the Coroners and Justice Act 2009. If it succeeds, the verdict is manslaughter instead of murder.',
    'Three parts: the defendant\'s acts must have resulted from a **loss of self-control**; it must have had a **qualifying trigger**, meaning a fear of serious violence, or things said or done of an extremely grave character causing a justifiable sense of being seriously wronged; and a person of the defendant\'s age and sex, with normal tolerance and self-restraint, might have reacted in the same or a similar way.',
    'The loss of control does not have to be sudden. A killing in a considered desire for revenge cannot qualify.',
  ], 'Was there a trigger, and was the response that of someone who really lost control?');

  add('Bad character of a victim', [
    '**Bad character** evidence is evidence of misconduct apart from the facts of the case. The Criminal Justice Act 2003 lets the defence use a victim\'s or witness\'s bad character if it is important explanatory evidence, or has substantial probative value on a matter in issue.',
    'It is allowed in order to show something real, such as who was likely the aggressor or whether a witness is reliable. It is not allowed merely to show someone is a bad person.',
    'The judge decides if the evidence is admitted, and tells the jury how to use it.',
  ], 'What does the victim\'s history actually prove about what happened that night?');

  add('Fraud by abuse of position', [
    'Section 4 of the Fraud Act 2006: fraud by abuse of position occurs where a person who occupies a position in which they are expected to **safeguard, or not act against, the financial interests** of another **dishonestly abuses that position**, intending to make a gain or cause loss.',
    'The position can be a trustee, an employee, a director or an attorney: it comes from a relationship of trust, not from a legal label. An abuse can be an omission as well as an act.',
    'As with all the Fraud Act offences, the prosecution must show dishonesty and the intent to make a gain or cause a loss. No loss need actually occur.',
  ], 'What duty did the defendant owe, and what did they do or fail to do with it?');

  add('Criminal attempts: more than merely preparatory', [
    'Under the Criminal Attempts Act 1981 a person attempts an offence if, with **intent** to commit it, they do an act which is **more than merely preparatory** to the commission of the offence.',
    'Preparation is getting ready. An attempt starts when the defendant has embarked on the crime proper. It is for the jury to decide where that point lies, on the facts.',
    'The intent must be to commit the full offence, even if the full offence is impossible in the circumstances.',
  ], 'Had the defendant stopped getting ready and started doing the crime itself?');

  add('Wounding with intent (s18) and unlawful wounding (s20)', [
    'Section 18 of the Offences Against the Person Act 1861 is wounding or causing grievous bodily harm **with intent** to do grievous bodily harm. It is a **specific intent** offence and is one of the most serious non-fatal offences.',
    'Section 20 is **unlawfully and maliciously** wounding or inflicting grievous bodily harm. It is satisfied by recklessness: the defendant need only have foreseen that some harm might result.',
    'A **wound** is a break in the continuity of the whole skin. **Grievous bodily harm** means really serious harm. The difference between the two sections is the defendant\'s state of mind.',
  ], 'Did the defendant aim to cause serious harm, or only take a risk that some harm would follow?');

  add('Unlawful wounding and grievous bodily harm (s20)', [
    'Section 20 of the Offences Against the Person Act 1861 punishes **unlawfully and maliciously wounding** or **inflicting grievous bodily harm** on another person.',
    '**Maliciously** here means intending some harm, or being reckless as to whether some harm, though not necessarily serious harm, might be caused. The defendant need not foresee wounding or serious harm.',
    'A wound is a break in the whole skin. Grievous bodily harm means really serious harm. Consent and self-defence can make the act lawful.',
  ], 'What harm did the defendant foresee, and does that satisfy the section?');

  add('Joint enterprise and accessory liability', [
    'Someone who **assists or encourages** an offence can be guilty alongside the person who commits it. The law on this is called **accessory liability**, or joint enterprise.',
    'The accessory must intend to assist or encourage, and know the essential facts of what the principal is going to do. Being present is not enough: there must be help or encouragement, and the intention to give it.',
    'If a principal goes beyond what was agreed, an accessory is not guilty of the extra offence unless they intended to encourage or assist that too.',
  ], 'What did the defendant do to help or encourage, and what did they know was planned?');

  add('Credibility of witnesses with a deal', [
    'Some witnesses give evidence after agreeing a deal with the prosecution, such as a reduced charge or a lighter sentence. Their evidence must be treated with caution.',
    'The jury should be told that such a witness may have a reason to lie or to exaggerate in order to keep the benefit. The judge gives a direction that the evidence needs careful scrutiny.',
    'The defence can cross-examine about the deal, the witness\'s record and anything that suggests that they may say what the Crown wants to hear.',
  ], 'What does the witness gain from giving this evidence, and is it supported by anything independent?');

  add('Gross negligence manslaughter', [
    'Gross negligence manslaughter is a killing by someone who **owed a duty of care** to the victim and **breached** it, where the breach caused the death and was so bad that the jury consider it **grossly negligent** and therefore criminal.',
    'The breach must create a **serious and obvious risk of death**, and not merely of injury, and a reasonable person in the defendant\'s position would have seen it.',
    'Whether the conduct is bad enough to be a crime is a question for the jury. Ordinary carelessness, even if it causes death, is not enough.',
  ], 'What duty did the defendant owe, and how obvious was the risk of death?');

  add('Causation and contributory acts', [
    'The prosecution must prove that the defendant\'s act was an operating and substantial cause of the result. It does not have to be the only cause: other people\'s acts, including the victim\'s, can also contribute.',
    'A victim\'s own conduct breaks the chain only if it was so daft or unexpected that no reasonable person could have foreseen it. A foreseeable response to the defendant\'s act does not.',
    'If a defendant\'s contribution was more than minimal, they can be responsible even if someone else also contributed.',
  ], 'Who or what else contributed, and was it so unexpected that it overtook the defendant\'s act?');

  add('Assault on a police constable in the execution of duty', [
    'Section 89 of the Police Act 1996 makes it an offence to **assault a constable in the execution of their duty**. The prosecution must prove the assault, and that the officer was acting in the execution of their duty at the time.',
    'An officer who is acting **unlawfully**, for example by making an arrest without telling the person why, is not acting in the execution of their duty.',
    'The defendant does not need to know they are dealing with a police officer to commit the offence, but if they were resisting what they honestly believed was an unlawful act, that may bear on whether force was justified.',
  ], 'Was the officer acting lawfully at the moment of the alleged assault?');

  add('Lawful arrest', [
    'A lawful arrest needs two things. First, **reasonable grounds** to suspect the person is committing or has committed an offence, under section 24 of the Police and Criminal Evidence Act 1984. Second, the person must be **told that they are under arrest and why**, as soon as practicable, under section 28.',
    'An arrest can be lawful at the start and become unlawful if the reason is not given within a reasonable time. An unlawful arrest makes the detention unlawful.',
    'Where an arrest is unlawful, an officer is not in the execution of their duty, and a person may use reasonable force to resist it.',
  ], 'Was the person told what they were being arrested for, and when?');

  add('Attempted murder and intention to kill', [
    'Attempted murder is an attempt under the Criminal Attempts Act 1981. The defendant must do an act **more than merely preparatory** to killing, with **intent to kill**.',
    'For attempted murder, intending to cause serious harm is not enough: the prosecution must prove an intention **to kill**. That is a higher mental element than for murder itself.',
    'The jury can infer the intention from what the defendant did and said, such as the weapon, the way it was used and the target.',
  ], 'What does the way the defendant acted say about whether they meant to kill?');

  add('Direct and oblique intention', [
    '**Direct intention** means the result was the defendant\'s aim or purpose: they acted in order to bring it about.',
    '**Oblique intention** (indirect) is where the result was not the aim but was a **virtually certain** consequence of what the defendant did, and they **realised** that it was. Following R v Woollin the jury is entitled, but not obliged, to find intention in those circumstances.',
    'The distinction matters most when a defendant says, \'I never wanted that to happen.\' Wanting is not the test; knowing it was virtually certain can be.',
  ], 'Did the defendant want the result, or at least know that it was virtually certain?');

  add('False imprisonment', [
    'False imprisonment is the **unlawful and intentional or reckless restraint of a person\'s freedom of movement**. It is a common law offence.',
    'No force or locked door is needed: restraint can be by words, a threat or by taking away something the person needs to leave. The restraint must be total, not just an obstacle in one direction.',
    'It is unlawful unless there is lawful authority, for example a lawful arrest, or the person consents.',
  ], 'Was the person free to leave, and did the defendant have the right to stop them?');

  add('Citizen\'s arrest and lawful authority', [
    'Under section 24A of the Police and Criminal Evidence Act 1984 anyone may arrest a person who is **committing** an indictable offence, or someone they have reasonable grounds to suspect is committing one, if it is not reasonably practicable for a constable to do so and the arrest is necessary to prevent certain things such as escape or injury or loss.',
    'The offence must **actually be being committed** for the power to apply to an arrest made on suspicion. If no offence was in fact being committed, the arrest may be unlawful and the detention false imprisonment.',
    'The arrest must be reasonably necessary and the force used must be reasonable.',
  ], 'Was an offence actually being committed, and was arrest really necessary at that moment?');

  add('Diminished responsibility', [
    'Diminished responsibility is a partial defence to murder under section 2 of the Homicide Act 1957. If it succeeds, the verdict is manslaughter.',
    'The defendant must show, on the **balance of probabilities**, that they were suffering from an **abnormality of mental functioning** arising from a recognised medical condition, which **substantially impaired** their ability to understand their conduct, form rational judgment or exercise self-control, and which provides an explanation for the killing.',
    'This is one of the few places where the burden is on the defendant, though the standard is lower than the Crown\'s. Medical evidence is usually central.',
  ], 'What recognised condition is relied on, and how does it explain what happened?');

  add('Expert evidence and the burden on the defence', [
    'Where the defence relies on something it must prove, such as diminished responsibility, the **burden** is on the defendant, to the lower **balance of probabilities** standard.',
    '**Expert evidence**, from a doctor or psychiatrist, helps the jury with matters outside ordinary experience. The jury still decides the facts and is not bound to follow an expert, but must give reasons for rejecting uncontradicted expert evidence.',
    'The prosecution can call its own expert. If the experts disagree, the jury weighs their qualifications, reasoning and the facts they relied on.',
  ], 'What does the expert say, and what has the jury seen that supports or contradicts it?');

  add('Intoxication and diminished responsibility', [
    'A defendant who is also intoxicated may still rely on **diminished responsibility** if the recognised medical condition itself substantially impaired their ability and explains the killing.',
    'A condition such as alcohol dependency syndrome can be a recognised medical condition. Ordinary drunkenness is not.',
    'The jury must decide whether the impairment came from the condition or from the voluntary drinking. If the condition would have had that effect even without the drink, the defence can still succeed.',
  ], 'Would the same impairment have happened without the drinking?');

  add('Perverting the course of justice', [
    'Perverting the course of justice is a common law offence of doing an act, or a series of acts, which has a **tendency to pervert** the course of public justice, with the **intention** of doing so.',
    'Examples include giving a false alibi, destroying evidence, making a false report or lying to the police to avoid being arrested. The course of justice does not have to have started: an investigation likely to begin is enough.',
    'The act need only tend to pervert; it need not succeed. The prosecution must prove the intention to pervert.',
  ], 'What did the defendant do, and what did they mean it to achieve?');

  add('Circumstantial evidence', [
    '**Circumstantial evidence** is evidence from which a fact can be inferred, as opposed to **direct evidence** such as an eyewitness. A fingerprint, a motive, a lie and being nearby are all circumstantial.',
    'It can be very strong, especially when several pieces point the same way. But the jury must be careful not to speculate: each piece must be proved, and the conclusion drawn must be the only reasonable one.',
    'The jury can also consider whether there is any other explanation for the facts which is consistent with innocence.',
  ], 'Does each piece of evidence point to guilt, or can each be explained innocently?');

  add('Conspiracy', [
    'Under the Criminal Law Act 1977 a person is guilty of **conspiracy** if they **agree** with one or more others to pursue a course of conduct which, if carried out, will necessarily amount to or involve an offence.',
    'The offence is the **agreement**. It does not matter whether the plan was ever carried out. The defendant must intend that the agreed course of conduct be carried out.',
    'It is usually proved from what the people said and did, since agreements are rarely written down. Being friendly with someone who commits an offence is not enough.',
  ], 'Is there evidence of an agreement, or only of people who knew each other?');

  add('Digital and cell-site evidence', [
    '**Cell-site evidence** shows which mobile phone mast a phone connected to. It places a phone within an area, but not at an exact spot.',
    'Digital records of calls, messages, locations and searches can support or undermine an account. They show what a device did, not necessarily who was using it.',
    'The questions to ask are how reliable the data is, how it was obtained, how precise the location is, and whether someone else might have had the phone.',
  ], 'What does the data prove about the phone, and what does it leave open about the person?');

  add('Consent as a defence to injury', [
    'In general a person cannot consent to the infliction of **actual bodily harm** or worse, if the act is intended to cause it, because it is not in the public interest.',
    'There are **exceptions**, including properly conducted sports, surgery, tattooing and rough horseplay. In sport a player consents to the risk of injury that comes with the rules and the ordinary conduct of the game.',
    'Consent is not available if the force goes well beyond the accepted rules and risks, or if the defendant intended serious harm.',
  ], 'Was this within the kind of risk players accept, or far outside it?');

  add('Murder: proving the killer', [
    'Before the questions of intent and defences, the prosecution must prove **who** killed the victim. That is the question of **identity**.',
    'Identity can be proved by eyewitness evidence, forensic evidence, confessions, or a combination of circumstantial evidence. Each type has its own risks and its own directions to the jury.',
    'If the jury are not sure it was the defendant, they must acquit, however bad the crime.',
  ], 'What exactly links this defendant, and no one else, to the killing?');

  add('DNA evidence, transfer and contamination', [
    'A **DNA match** is described as a probability: how likely it is that a sample would match a random person. A high figure is powerful, but it shows the DNA is the defendant\'s, not how it got there.',
    '**Transfer** means DNA can move from one person to an object, or onto another surface, without direct contact, for example via a shared item. **Contamination** is where a sample picks up DNA after the event, during collection or analysis.',
    'The defence can ask about both, and about whether the sample was collected, stored and tested properly.',
  ], 'Could the defendant\'s DNA have reached that place without them being involved in the offence?');

  add('Evidence of an informant and bad character', [
    'Evidence from an **informant**, who may be paid or have a criminal record, needs particular care. The judge gives the jury a **warning** that the witness may have a reason to lie.',
    'The informant\'s **bad character** can be put to the jury if it is relevant to their credibility, and the court decides whether the evidence is admitted.',
    'The jury weighs what the informant says against anything that independently confirms it.',
  ], 'What does the informant stand to gain, and what independent evidence supports them?');

  add('Duress by threats', [
    '**Duress by threats** is a defence to most crimes except murder and attempted murder. The defendant says they were forced to commit the offence by a threat of death or serious injury.',
    'Two tests: was the defendant, because of what they reasonably believed, **compelled** to act by the threat; and would a sober person of reasonable firmness, sharing their characteristics, have responded in the same way?',
    'The defence fails if the defendant had a safe opportunity to escape or go to the police, or **voluntarily put themselves** in a position where threats were foreseeable.',
  ], 'Was there a safe way out, and had the defendant put themselves in this position?');

  add('Voluntary association with criminals', [
    'The defence of duress is **not available** if the defendant voluntarily associated with criminals and knew, or ought to have known, that they might be subjected to compulsion to commit an offence of the kind charged.',
    'It is not enough to have mixed with a criminal group: the defendant must have been aware that violence or threats to make them commit crimes was a real possibility.',
    'The jury decides what the defendant knew when they joined or stayed with the group.',
  ], 'What did the defendant know about the people they were with, and when?');

  L.lessons = lessons;
  // The lesson as the guidance panel shows it: paragraphs with the key terms in bold, then one question to think about.
  L.lessonHtml = function (label) {
    const l = lessons[label];
    if (!l) return null;
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bold = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    return l.body.map((p) => `<p>${bold(p)}</p>`).join('') + `<p class="think"><b>Think about it:</b> ${bold(l.think)}</p>`;
  };
})();
