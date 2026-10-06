/*
 * Be the Chancellor: the lessons behind an investigation.
 * Written from scratch for someone who has never done any of this, and built up chapter by chapter: what a cause is, how to describe
 * data, regression, why a before-and-after comparison misleads, difference-in-differences, fixed effects, event studies, synthetic
 * control, inference with few countries, cost-benefit analysis, and turning evidence into a decision.
 * Everything is plain text. **double asterisks** mark a key term. Equations are written in plain characters so they read anywhere.
 */
(function (root) {
  var C = [];
  var chap = function (id, title, summary, sections) { C.push({ id: id, title: title, summary: summary, sections: sections }); };

  chap('causal', 'What is a cause?', 'Why "what happened after" is not the same as "what it did"', [
    { h: 'The question every Chancellor faces', b: [
      'Suppose you cut income tax and, a year later, growth is higher. Did the tax cut do that? Maybe. But growth might have risen anyway because the world economy recovered, or because an oil price fell, or because firms had finally finished an investment they started years ago. You only ever see one version of events: the one where you made the cut.',
      'This is the central difficulty of economics, and it has a name: the **fundamental problem of causal inference**. We want to know what would have happened if we had done something different, but we cannot go back and run the other world.',
    ] },
    { h: 'Two worlds', b: [
      'Let us give the idea some words. For one country in one quarter, there are two possible outcomes. Call the growth rate **with** the policy Y1, and the growth rate **without** it Y0. The **causal effect** of the policy on that country is the difference.',
      { eq: 'effect = Y1 - Y0' },
      'We can observe Y1 or Y0, never both. Whichever one we do not see is called the **counterfactual**: the thing that did not happen. Every method in this game is a way of estimating a counterfactual and then comparing it with what did happen.',
      { ex: 'A country cuts its basic tax rate in quarter 20. Growth in quarter 22 is 2.6%. What would growth have been without the cut? If we believe it would have been 2.1%, the effect is 0.5 points. Everything depends on where the 2.1% comes from. That is what the rest of these lessons are about.' },
    ] },
    { h: 'Correlation is not cause', b: [
      'Two things are **correlated** if they tend to move together. Countries that cut taxes might have higher growth. But that does not mean cutting taxes raised growth. There are three common reasons the link can be misleading.',
      { list: [
        '**Something else drives both.** A boom raises tax revenue, so the government can afford to cut taxes; the boom also raises growth. The tax cut did not cause the growth.',
        '**The cause runs the other way.** Governments often cut taxes when growth is poor, to try to help. The countries with weak growth are the ones cutting, so the cut looks harmful even if it helps.',
        '**Chance.** With a small number of countries, patterns appear by luck.',
      ] },
      'The first two are called **confounding** and **reverse causation**. They mean that comparing countries that did something with countries that did not can give a badly wrong answer.',
    ] },
    { h: 'What would make a comparison fair?', b: [
      'Imagine we could choose, by tossing a coin, which countries got the policy. Then the countries that got it and the ones that did not would be alike in every other way on average, apart from luck. Any difference in outcomes afterwards would be caused by the policy. This is a **randomised experiment**, and it is the gold standard.',
      'Governments cannot toss coins over whole economies. So economists look for situations that come close to a fair comparison, or they use methods that correct for the unfairness. Difference-in-differences, event studies and synthetic control, which you will use in an investigation, are three of the most important.',
      { check: ['Why can we not simply compare countries that cut taxes with those that did not?', 'Because the countries may differ in other ways that affect growth (confounding), and governments often cut taxes in response to how the economy is doing (reverse causation). The difference you see mixes the effect of the policy with those other differences.'] },
    ] },
  ]);

  chap('stats', 'Describing data and measuring doubt', 'Averages, spread, standard errors and confidence intervals, from nothing', [
    { h: 'Summarising a list of numbers', b: [
      'Suppose you have the growth rates of ten countries. The simplest summary is the **mean** (the average): add them up and divide by how many there are.',
      { eq: 'mean = (x1 + x2 + ... + xn) / n' },
      'The mean does not say how scattered the numbers are. Two sets can have the same mean and look very different. The usual measure of scatter is the **standard deviation**: roughly, how far a typical value is from the mean. You find the distance of each value from the mean, square them, average the squares (dividing by n - 1), and take the square root.',
      { eq: 'sd = sqrt( sum of (xi - mean)^2 / (n - 1) )' },
      { ex: 'Growth in five countries: 1, 2, 2, 3, 4. The mean is 2.4. The distances from the mean are -1.4, -0.4, -0.4, 0.6, 1.6. Their squares are 1.96, 0.16, 0.16, 0.36, 2.56, which sum to 5.2. Divide by 4 to get 1.3, and the square root is about 1.14. So a typical country is about 1.1 points from the average.' },
    ] },
    { h: 'A sample is not the whole truth', b: [
      'The ten countries in the Treasury file are a **sample**: a small piece of what could have happened. If the same ten countries lived through a different run of luck, we would get a different average. So any number we calculate from the sample, an average, a difference between two averages, an effect of a policy, is itself uncertain.',
      'The size of that uncertainty is measured by the **standard error**. For a mean, it is the standard deviation divided by the square root of the number of observations.',
      { eq: 'standard error of a mean = sd / sqrt(n)' },
      'This formula has two lessons. More data means less uncertainty. And the gain is slow: to halve the standard error you need four times as many observations.',
    ] },
    { h: 'Confidence intervals', b: [
      'A **confidence interval** turns the standard error into a range. A 95% interval is built so that, if you repeated the whole exercise many times with fresh samples, about 95 out of 100 of the intervals so constructed would contain the true value.',
      { eq: 'estimate  +/-  c x standard error' },
      'The number c is about 1.96 when there is a lot of data. When there are few observations, as here, c is larger, taken from the **t distribution**. With 10 degrees of freedom, c is about 2.23. That is why small samples give wide intervals.',
      'Be careful what the interval does not say. It does not say there is a 95% chance the truth lies in this particular interval. It describes the method, not one result.',
    ] },
    { h: 'Testing a claim', b: [
      'A **hypothesis test** asks whether the data are consistent with an effect of zero. You take the estimate and divide it by its standard error, giving a **t statistic**: how many standard errors the estimate is from zero. If it is large, zero looks unlikely.',
      { eq: 't = estimate / standard error' },
      'The **p-value** is the probability of getting an estimate at least this far from zero if the true effect really were zero. A small p-value (below 0.05 is the usual convention) means the data would be surprising under no effect.',
      { list: [
        'A p-value is **not** the probability that the policy does nothing.',
        'A large p-value does not show there is no effect. It may mean you have too little data to tell.',
        'A tiny effect can be "significant" with enough data, and a large effect can be "insignificant" with too little. Always look at the size of the interval, not only the p-value.',
      ] },
      { check: ['An estimate is +0.4 with a standard error of 0.3 and 10 degrees of freedom. Is it clearly different from zero?', 't = 0.4 / 0.3 = 1.33, well below the 2.23 needed for 95%. The interval is 0.4 +/- 2.23 x 0.3, which is about -0.27 to +1.07. It includes zero, so the data do not rule out no effect.'] },
    ] },
  ]);

  chap('regression', 'Regression from scratch', 'Fitting a line, reading the coefficient, and standard errors you can trust', [
    { h: 'The idea', b: [
      'We often want to know how one thing changes with another. If a country raises VAT by 1 point, how much does inflation move? **Regression** answers by fitting a straight line through the data and reading off its slope.',
      { eq: 'y = a + b x + error' },
      'Here y is the outcome (inflation), x is the thing we think matters (the VAT change), **b is the coefficient** we care about (the change in y for a one-unit rise in x), a is the starting level, and the error is everything else that moves y.',
    ] },
    { h: 'How the line is chosen', b: [
      'Of all possible lines, regression picks the one that makes the squared gaps between the data points and the line as small as possible. This is **ordinary least squares**, or OLS. For one x it has a simple form.',
      { eq: 'b = covariance(x, y) / variance(x)' },
      'In words: the slope is how much x and y move together, relative to how much x moves on its own. If x varies a lot and y follows it, the slope is steep. If x barely varies, you cannot learn much about its effect, and the slope is imprecise.',
      { ex: 'Four countries raised VAT by 0, 1, 2, 3 points, and inflation rose by 0.1, 0.5, 0.9, 1.5. The average x is 1.5 and the average y is 0.75. Covariance and variance work out so that b = 0.46: each extra point of VAT came with about 0.46 more points of inflation.' },
    ] },
    { h: 'More than one variable', b: [
      'Real outcomes depend on many things. A regression with several variables fits a **plane** instead of a line.',
      { eq: 'y = a + b1 x1 + b2 x2 + ... + error' },
      'The coefficient b1 now means the change in y for a one-unit change in x1, **holding the other variables fixed**. This is what economists mean by "controlling for" something. It is powerful, but it can only control for what you have measured.',
    ] },
    { h: 'How good is the fit, and how sure are we?', b: [
      'The **R-squared** tells you what share of the variation in y the line explains, from 0 to 1. It is not a measure of whether the estimate of b is right. A model can have a low R-squared and still estimate one coefficient well.',
      'For the coefficient itself, the **standard error** measures how much it would bounce around across samples. It is smaller when there is more data, when x varies a lot, and when the errors are small.',
    ] },
    { h: 'When errors are not nicely behaved', b: [
      'The simple standard-error formula assumes the errors are scattered evenly and are unrelated across observations. In panel data from countries, that is almost never true. A country that is hit by a shock this quarter is likely to still be affected next quarter, so its errors are **correlated over time**.',
      'The fix is **cluster-robust standard errors**: allow the errors to be related within each country, and treat each country, not each quarter, as one independent piece of evidence. Ignoring this makes standard errors far too small and your results look more certain than they are.',
      'Clustering has a price. With only 20 countries you have 20 clusters, so the estimate of the standard error is itself noisy, and we use a t distribution with 19 degrees of freedom rather than the normal curve. That is why an investigation reports "clusters", not "observations".',
      { check: ['A panel has 20 countries over 36 quarters, which is 720 observations. How many independent pieces of information do the clustered standard errors treat it as having?', 'About 20, the number of countries. The 36 quarters of one country are not independent of each other, so they do not count as 36 separate pieces of evidence.'] },
    ] },
  ]);

  chap('beforeafter', 'Why before and after misleads', 'Shocks everyone shares, trends, and the bounce-back after a bad spell', [
    { h: 'The tempting comparison', b: [
      'The simplest way to estimate a policy\'s effect is to look at the same country before and after: growth was 1.8% before the cut and 2.6% after, so the cut added 0.8 points. This is called a **before-and-after** or **pre-post** comparison.',
      'It sounds sensible. It is also frequently wrong, for three reasons.',
    ] },
    { h: 'Reason 1: other things changed too', b: [
      'Between "before" and "after" the world did not stand still. If every country\'s growth rose at that time (the world economy recovered, or oil prices fell), the country that cut taxes gets credit for a change that would have happened anyway. Shocks that hit many countries at once are called **common shocks**.',
      { ex: 'Suppose world growth rose by 0.6 points over the same period. A before-and-after comparison of 0.8 attributes all of it to the policy, but 0.6 of it was the world. The policy\'s contribution is only 0.2.' },
    ] },
    { h: 'Reason 2: trends', b: [
      'If the economy was already speeding up, growth would have been higher "after" with or without the policy. A before-and-after comparison reads that existing trend as an effect.',
    ] },
    { h: 'Reason 3: governments act when things are bad', b: [
      'Governments rarely change policy at random. They cut taxes, spend more or change rules when the economy is weak. Weak spells tend to end by themselves: a country that has had several bad quarters is likely to do better next quarter simply because bad luck rarely lasts. This is called **mean reversion**.',
      'So the quarters just before a policy are often unusually bad, and the quarters afterwards bounce back. A before-and-after comparison credits the bounce to the policy. Economists call the dip before the policy the **Ashenfelter dip**, after the labour economist who noticed it in training programmes: people enrol when their earnings have just fallen.',
      { ex: 'In an investigation, the countries that adopted a policy often show a slide before they act. A before-and-after estimate overstates the effect, because it compares the policy quarters with the worst of the slide.' },
    ] },
    { h: 'What to do about it', b: [
      'The remedy for all three is the same idea: find a **comparison group** that experienced the same common shocks and trends but did not get the policy, and use it to estimate what would have happened to the adopting countries without it. That is the logic of difference-in-differences, the next lesson.',
      { check: ['A country raises interest rates when inflation is high, and inflation falls over the next year. Why might this overstate the effect of the rate rise?', 'Inflation spells tend to fade by themselves (mean reversion), and the rate rise came at the peak. Part of the fall would have happened anyway, so the before-and-after comparison credits the policy with the whole fall.'] },
    ] },
  ]);

  chap('did', 'Difference-in-differences', 'Subtracting what would have happened anyway', [
    { h: 'The idea in one sentence', b: [
      'Take the change over time in countries that adopted the policy, and subtract the change over the same time in countries that did not. What is left is the estimate of the policy\'s effect. That is a **difference in differences**: the difference between two differences.',
      { eq: 'DiD = (adopters after - adopters before) - (others after - others before)' },
    ] },
    { h: 'Why it works', b: [
      'The first difference removes anything that is constant about a country: its size, its structure, its culture. The second difference removes anything that changed for everyone over the same period: world growth, the oil price, a global financial scare. What survives is what changed only for the countries that adopted.',
      { ex: 'Adopters\' growth rose from 1.8 to 2.6, a change of +0.8. Countries that did not adopt rose from 1.9 to 2.3, a change of +0.4. The difference in differences is 0.8 - 0.4 = +0.4. We say the policy raised growth by 0.4 points, because 0.4 of the rise would have happened anyway.' },
    ] },
    { h: 'The big assumption: parallel trends', b: [
      'The method rests on one assumption that you cannot prove: without the policy, the adopting countries would have moved **in parallel** with the countries that did not. Their levels may differ, but their changes over time must be alike.',
      'If the adopters were already speeding up, or were about to bounce back from a bad spell, the comparison group does not show what would have happened to them, and the estimate is biased.',
      'You cannot observe parallel trends after the policy (that is the counterfactual). But you can look at the period **before** it. If the two groups were moving together before adoption, that makes the assumption more believable. If they were drifting apart, it is a warning. The event study, two lessons on, formalises this check.',
    ] },
    { h: 'Reading the estimate', b: [
      'A difference-in-differences estimate is the average effect on the countries that adopted, over the period after the policy took effect. It does not tell you what the effect would be for a country that did not adopt, and it can hide big differences between countries.',
      'Remember too that policies take time. A tax change may have no effect for two quarters while it is legislated. The investigation measures the "after" period from when the policy actually came into force, using the lags shown on each policy card.',
      { check: ['Adopters\' unemployment rose by 1.0 point, and non-adopters\' rose by 0.7. What is the difference-in-differences estimate, and what is the main assumption behind it?', '+0.3 points. It assumes that, without the policy, the adopters\' unemployment would have risen by the same 0.7 as the others, that is, the two groups would have followed parallel trends.'] },
    ] },
  ]);

  chap('twfe', 'Fixed effects and panel regression', 'The same idea as a regression, with standard errors, and where it goes wrong', [
    { h: 'Panels', b: [
      'Data on many countries over many quarters is called a **panel**. Each row is a country in a quarter. A panel lets us use both comparisons at once: the same country over time, and different countries at the same time.',
    ] },
    { h: 'The regression version', b: [
      'The two-by-two difference-in-differences works when there is one adoption date. When countries adopt at different times it is neater to use a regression.',
      { eq: 'y(it) = country effect(i) + quarter effect(t) + b x D(it) + error' },
      'Here D(it) is 1 if country i has adopted by quarter t, and 0 otherwise. The **country effects** give each country its own level, which removes anything permanent about it. The **quarter effects** give each quarter its own level, which removes anything common to every country that quarter. The coefficient b is then the difference-in-differences estimate. This is called a **two-way fixed-effects** regression, or TWFE.',
      'In practice we do not need to estimate hundreds of dummy variables. Subtracting each country\'s average and each quarter\'s average from every variable (the "within" transformation) gives the same b.',
    ] },
    { h: 'Standard errors, again', b: [
      'Because a country\'s quarters are linked, we cluster the standard errors by country. With 20 countries we have 20 clusters and rely on the t distribution with 19 degrees of freedom. The investigation shows both the naive and the clustered standard error: notice how different they are.',
    ] },
    { h: 'A hidden problem with staggered adoption', b: [
      'When countries adopt at different dates, TWFE has a flaw that took economists decades to notice. The regression uses **every** comparison it can find, and that includes comparing a country that adopts late with one that adopted early and is still feeling the effect. In effect, early adopters serve as the control group for late adopters, even though they are treated.',
      'If the effect of the policy grows or fades over time, or differs between countries, this produces a bias, and in extreme cases the estimate can have the wrong sign. The more adoption dates there are, and the more the effects vary, the worse it gets.',
      'The remedy is to compare each adopting country only with countries that have **never** adopted (or have not adopted yet), cohort by cohort, and then average. That is the idea behind the "clean comparison" in the event study tab, in the style of Callaway and Sant\'Anna. When the TWFE result and the clean result disagree, trust the clean one.',
      { check: ['Why can using already-treated countries as a comparison group distort the estimate?', 'Because they are still affected by the policy. Comparing a new adopter with them subtracts a treated outcome, not a no-policy outcome, so the comparison does not show what would have happened without the policy.'] },
    ] },
  ]);

  chap('event', 'Event studies and testing the assumption', 'Quarter-by-quarter effects, and what the quarters before adoption tell you', [
    { h: 'Looking at the whole path', b: [
      'A single number hides the timing. Does the effect start at once or build slowly? Does it last or fade? An **event study** estimates a separate effect for each quarter relative to adoption: three quarters before, one before, the quarter of adoption, three after, and so on.',
      'We need one quarter to measure against. By convention it is the quarter just before adoption (quarter -1), set to zero. Every other point is the difference, relative to that quarter, between the adopters and the comparison countries.',
    ] },
    { h: 'Reading the chart', b: [
      'Each dot is an estimate, and the line through it is its 95% confidence interval. The dotted vertical line marks adoption. Policies take time to bite, so expect zeros for the first quarters after adoption and then a gradual shift.',
      'The most important part is the left-hand side. **Before adoption, nothing yet should have happened.** If the leads (the quarters before) are all close to zero, the adopters and the comparison group were moving in parallel, which supports the key assumption. If the leads drift up or down, they were already on different paths and the later estimates are suspect.',
      { ex: 'Suppose adopting countries had been sliding relative to the others for ten quarters before they acted. The leads would slope downwards towards adoption. A later "recovery" would then look like an effect of the policy, though it is the slide ending.' },
    ] },
    { h: 'A formal pre-trend test', b: [
      'We can ask whether all the leads are jointly zero. The test adds up each lead\'s squared estimate divided by its variance and compares the total with how large it would be by chance, which we find by resampling countries (the **bootstrap**, in the inference lesson). A small p-value means the countries were not on parallel paths.',
      'Treat the test with care. With few countries it has little power, so passing it does not prove the assumption. And with many tests, some will fail by luck. Look at the whole picture.',
    ] },
    { h: 'Two versions of the chart', b: [
      'The investigation shows the event study two ways. The **clean comparison** uses only never-adopters as the comparison, one adoption cohort at a time. The **regression version** uses all countries in a single TWFE regression.',
      'With staggered adoption they can differ, and the regression version can show differences before adoption that are an artefact of the method. If the two disagree, the clean version is the better guide.',
      { check: ['What would you conclude if the leads in an event study were clearly sloping down before adoption?', 'That the adopting countries were already on a different, worsening path before they acted, so the parallel-trends assumption is doubtful, and any later improvement may be a recovery rather than an effect of the policy.'] },
    ] },
  ]);

  chap('synth', 'Synthetic control', 'Building a stand-in country from the ones that did nothing', [
    { h: 'When one country is the story', b: [
      'Sometimes there is just one country that adopted a policy, and it does not look like any single other country. Picking one comparison country would be arbitrary. **Synthetic control** builds a better comparison: a weighted average of several countries that did not adopt.',
    ] },
    { h: 'How it is built', b: [
      'We have a pool of **donor** countries that did not adopt. We choose weights, one per donor, that are never negative and add up to one, so that the weighted average of the donors\' outcomes tracks the adopting country\'s outcomes as closely as possible over the quarters **before** adoption.',
      { eq: 'choose weights w(j) >= 0, sum of w = 1, to minimise  sum over pre-adoption quarters of ( y(treated,t) - sum of w(j) x y(j,t) )^2' },
      'The restriction to non-negative weights that add to one stops the method extrapolating: the stand-in always lies inside the range of the donors. The result is a "synthetic" country that matched the real one before the policy.',
    ] },
    { h: 'Reading the result', b: [
      'After adoption, the real country and its synthetic twin are plotted together. If they track each other before adoption and then separate, the gap is the estimated effect. Check the fit before adoption: if the twin did not track the real country then, the gap afterwards means little.',
      { ex: 'A country adopts a tax cut. Its synthetic twin is 45% Country D, 30% Country H and 25% Country K. Before adoption the two lines are almost on top of each other. Afterwards the real country\'s growth is 0.5 points higher. That gap is the estimate.' },
    ] },
    { h: 'Placebo tests: how to know it is not luck', b: [
      'There is no standard error formula. Instead we ask how unusual the gap is by running the same method on countries that did not adopt, as though they had. For each donor, we build a synthetic control from the others and see what gap opens at the same date.',
      'If the real country\'s gap is bigger than almost all the placebo gaps, it is unlikely to be chance. The p-value is the share of countries, the real one included, whose gap is at least as large. With 12 untreated countries, the smallest possible p-value is 1/13, about 0.08, so the method cannot show high significance with few donors.',
      'Because countries that fit badly before adoption naturally have large gaps afterwards, we compare the ratio of the gap after to the fit before, not the raw gap.',
      { check: ['Why do we check how well the synthetic control tracked the country before the policy?', 'Because the method relies on the stand-in showing what would have happened without the policy. If it could not match the country beforehand, there is no reason to trust it afterwards, and any later gap could just be poor fit.'] },
    ] },
  ]);

  chap('homecase', 'Using your own country\'s history', 'One country, one past episode, and what it can and cannot tell you', [
    { h: 'Your country has a record too', b: [
      'The other countries in an investigation are other economies. But the country you run has a history as well, and it has probably tried things before: a tax rate that was raised, a spending programme that was cut, a rule that was changed. That record is evidence, and it has one great advantage: it is **your own economy**, with the same institutions, the same firms and the same households.',
    ] },
    { h: 'The difficulty: one country, one episode', b: [
      'With one country and one past change you cannot average anything. You only have a single line on a chart and a date where something happened. Reading it takes care, for the same three reasons as before.',
      { list: [
        '**Other things changed.** The world economy was moving as well, so some of what followed the change was not the change.',
        '**Trends.** The economy may already have been speeding up or slowing down.',
        '**Why did the government act then?** Governments often change policy after a bad spell. Bad spells tend to end by themselves (**mean reversion**), so the quarters after the change look better than the quarters before it, whatever the policy did.',
      ] },
      'This is why a plain before-and-after comparison on your own record is the weakest reading you can make of it.',
    ] },
    { h: 'Borrowing the other countries as a comparison', b: [
      'The other countries that did nothing give you a picture of what the world was doing over the same quarters. Subtract their change from yours and you have a **difference-in-differences** for a single country. A **synthetic control** goes further: it blends those countries, with weights chosen so the blend followed yours closely before the change, and any gap afterwards is the estimate of the effect.',
      'How sure can you be of a single estimate? **Placebos** help. Pretend each country that did nothing had made the change at the same date and run the same calculation. If your country\'s gap is larger than most of the placebo gaps, chance alone is an unlikely explanation.',
      { ex: 'Suppose your country\'s unemployment fell by 0.3 points after a change, while the countries that did nothing saw it fall by 0.2. The difference-in-differences is a fall of 0.1, not 0.3: most of the fall was the world, not the policy.' },
    ] },
    { h: 'Which should you trust?', b: [
      'Neither is perfect. The other countries give you many episodes, but none of them is your economy. Your own record is your economy, but it is one episode, in a world that has changed since. A sensible reader asks whether they **agree**.',
      { list: [
        'If they point the same way, you can be more confident.',
        'If they disagree, ask what was different then: the size of the change, how the economy was doing, what else the government did at the same time. That difference may be the real lesson.',
      ] },
      { twist: 'A true effect in the past is not a promise for the future. The economy has moved on since, so use your own record as a guide to the direction and rough size, not as a forecast.' },
    ] },
  ]);

  chap('inference', 'Doubt with few countries', 'Why ordinary p-values can mislead, and the bootstrap and randomisation tests', [
    { h: 'The small-sample problem', b: [
      'Our panels have about twenty countries, eight of which adopt. That is far fewer than the hundreds or thousands that standard formulas assume. With so few independent units, the usual p-values can be too optimistic, and an effect that looks clearly real may not be.',
    ] },
    { h: 'Randomisation inference', b: [
      'Here is a different way to ask "could this be luck?" without any formulas. Suppose the policy had no effect at all. Then it would not matter which countries had received it. So: take the real data, shuffle the labels so that a random set of eight countries is "treated" (with the same adoption dates), compute the estimate, and repeat many times.',
      'This gives the distribution of estimates you would see by chance when nothing is going on. Where does your real estimate fall? The p-value is the fraction of shuffles that give an estimate at least as large as yours in absolute size.',
      { eq: 'p = (number of shuffles with |estimate| >= |actual|) / (number of shuffles)' },
      'The logic is simple and the answer is valid however few countries there are, because it uses only the assignment itself.',
    ] },
    { h: 'The bootstrap', b: [
      'The **bootstrap** estimates uncertainty by resampling. Draw countries from your sample with replacement, to make a new panel the same size (some countries appear twice, some not at all), recompute the estimate, and repeat hundreds of times. The spread of the estimates is a measure of the standard error.',
      'We resample whole countries, not single quarters, so that each country\'s time-linked errors move together. The investigation uses this for the clean event study and for the pre-trend test.',
    ] },
    { h: 'What these tests do not do', b: [
      'A randomisation or bootstrap test tells you how likely an estimate is to be a fluke. It does **not** tell you whether the comparison was fair. A badly biased comparison, say one where adopters were already recovering from a slump, can give a "significant" answer every time. Significance answers "is it luck?" The earlier lessons answer "is it fair?" You need both.',
      { check: ['A test says p = 0.01. Does that show the policy caused the effect?', 'No. It shows the pattern is unlikely to be chance if the comparison is fair. If the adopting countries were already on a different path, the pattern could be significant and still be wrong about the policy.'] },
    ] },
  ]);

  chap('cba', 'Cost-benefit analysis', 'Putting everything in today\'s money, and being honest about what you do not know', [
    { h: 'The principle', b: [
      'An effect on growth tells you what a policy does. It does not tell you whether it is worth doing. **Cost-benefit analysis** counts everything the policy gains and everything it costs, in the same units, so they can be compared. If the benefits exceed the costs, the policy is worth doing, other things equal.',
      { eq: 'net benefit = benefits - costs' },
      'The two sides here are the extra output the economy produces (the benefit) and the extra government borrowing the policy requires (the cost). Your analysis tab expresses both as a percentage of one year\'s GDP.',
    ] },
    { h: 'Discounting: money now is worth more than money later', b: [
      'A pound today is worth more than a pound in four years: you could invest it, and people prefer to have things sooner. So we **discount** future amounts. A discount rate of 3.5% means a pound a year from now is worth about 96.6 pence today.',
      { eq: 'present value = amount / (1 + r)^t' },
      'The discount rate matters most for policies whose costs come early and benefits late, such as education or infrastructure. A high rate makes them look poor.',
      { ex: 'A road costs 1.0 now and delivers 0.3 a year for five years. Undiscounted, that is 1.5 against 1.0. At a 3.5% discount rate, the five years are worth about 1.35 today, so the net benefit is 0.35. At 10%, they are worth 1.14 and the net benefit is only 0.14.' },
    ] },
    { h: 'The cost of public money', b: [
      'Every pound the government borrows or taxes has a cost beyond the pound itself: taxes discourage work and investment, and borrowing has to be repaid with interest. The **marginal cost of public funds** (MCPF) captures this. If it is 0.25, then each unit of extra borrowing costs society 1.25.',
      { eq: 'cost to society = (1 + MCPF) x extra borrowing' },
      'This is why a tax cut for which borrowing makes up the difference rarely "pays for itself" in this analysis: the extra growth is real, but smaller than the cost of the money.',
    ] },
    { h: 'Who gains? Distribution and equity', b: [
      'A pound to a poor household usually matters more than a pound to a rich one. **Distributional weights** capture this: gains to groups with lower incomes count for more. The analysis tab lets you set how much weight to place on equity. Setting it to zero treats a pound as a pound, whoever gets it.',
    ] },
    { h: 'Uncertainty: do not report one number', b: [
      'The model\'s effect on output is itself uncertain, and shocks to the economy will vary. So the analysis runs the model 200 times with different random shocks and also draws the size of the policy\'s effect from a range, producing 200 different net benefits. The histogram shows how they spread.',
      'The key outputs are the **average**, the range that contains 90% of the outcomes, and the **probability that the net benefit is positive**. A policy with a modest average but a 95% chance of being positive is a safer bet than one with a bigger average that loses money in a third of cases.',
    ] },
    { h: 'Sensitivity: what would change the answer?', b: [
      'Finally, vary each assumption in turn (the discount rate, the cost of public funds, the weight on equity, how long the effect lasts) and see how the net benefit moves. A bar chart of these swings is called a **tornado diagram**. The assumptions with the longest bars deserve the most argument, because they are the ones that decide the result. If the answer flips sign within a plausible range, say so.',
      { check: ['A policy has a net benefit of +0.4 on average, but is positive in only 55% of simulations. How would you describe it?', 'As a marginal, risky bet: the average is positive, but almost as many outcomes lose money as make it. The honest recommendation would be a smaller or trial version.'] },
    ] },
  ]);

  chap('decide', 'From evidence to a decision', 'Putting the pieces together, and what you still will not know', [
    { h: 'A decision is more than an estimate', b: [
      'By now you may have several estimates: before-and-after, difference-in-differences, a regression, a synthetic control. They will not agree exactly. A good analyst does not pick the one she likes; she asks which comparisons are most believable, and which are consistent.',
      { list: [
        'Did the countries move in parallel before adoption? If not, discount the methods that assume they did.',
        'Do the clean comparison and the regression agree? If not, trust the clean one.',
        'Is the interval narrow enough to be useful, or so wide that it includes both a large benefit and a large harm?',
        'Is the effect large enough to matter, not just statistically significant?',
      ] },
    ] },
    { h: 'Giving an estimate and an interval', b: [
      'A good conclusion states a best guess and how unsure you are. An interval that is too narrow is overconfidence: it will miss the truth too often. An interval that is so wide it says nothing is useless. Aim for an interval that would contain the truth about nine times in ten.',
    ] },
    { h: 'Limits you can never remove', b: [
      { list: [
        '**External validity.** The effect in other countries may not be the effect in yours, especially if your economy differs in a way that matters.',
        '**Scale.** A small change may behave differently from a large one.',
        '**Timing.** The same policy can work in a slump and fail in a boom.',
        '**Reaction.** If people expect a policy to change, they act in advance, so effects can appear before adoption. This is a reason why leads in an event study may not be zero.',
        '**The economy changes.** The relationships estimated from the past may shift once the policy itself changes how people behave. Economists call this the **Lucas critique**.',
      ] },
      'None of this means evidence is useless. It means conclusions should be stated as "the evidence suggests" and not "this will happen".',
    ] },
    { h: 'Deciding anyway', b: [
      'You still have to act. A reasonable rule: if the net benefit is clearly positive and robust to your assumptions, adopt it. If it is positive on average but risky, consider a smaller version and review it after the first budget. If it is negative, or the evidence is too weak to tell and the downside is large, leave it out.',
      'Then watch what happens. Your own country is a new data point, and the best analysts treat a policy as an experiment they learn from.',
      { check: ['Your estimate is +0.2 growth, with a 95% interval of -0.5 to +0.9, and the cost-benefit is positive in 60% of simulations. What do you do?', 'The evidence cannot rule out harm or a decent gain. A cautious choice is a smaller version that limits the downside, with a plan to review it. Adopting the full policy would be betting on the favourable end of the interval.'] },
    ] },
  ]);

  root.LMLessons = { chapters: C, get: function (id) { return C.filter(function (x) { return x.id === id; })[0] || null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LMLessons;
})(typeof window !== 'undefined' ? window : globalThis);
