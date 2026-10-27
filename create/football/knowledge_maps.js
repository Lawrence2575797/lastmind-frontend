// The knowledge maps: every point of the Edexcel specifications as a node, joined to the points it needs first. GCSE Maths is Edexcel 1MA1 (strands N number, A algebra,
// R ratio and proportion, G geometry, P probability, S statistics); A-level Maths is Edexcel 9MA0, in three separate maps (pure, statistics, mechanics).
// A node is { id, t (title), spec (the specification reference), pre: [ids] }. A lesson for a node is written in knowledge_lessons_*.js with the same id; a node with no
// lesson yet is still on the map, so the order of the whole subject can be seen, and is marked as being written.
(function () {
  const FM = (window.FM = window.FM || {});
  const n = (id, t, spec, pre) => ({ id, t, spec, pre: pre || [] });

  const GCSE = [
    { strand: 'Number', nodes: [
      n('g-ints', 'Integers, place value and ordering', 'N1', []),
      n('g-neg', 'Negative numbers', 'N1, N2', ['g-ints']),
      n('g-ops', 'The four operations and BIDMAS', 'N2, N3', ['g-ints']),
      n('g-dec', 'Decimals and place value', 'N1, N2, N10', ['g-ints']),
      n('g-frac', 'Fractions: equivalent, simplifying, comparing', 'N1, N8', ['g-ops']),
      n('g-fracops', 'Adding, subtracting, multiplying and dividing fractions', 'N2, N8', ['g-frac']),
      n('g-fdp', 'Fractions, decimals and percentages', 'N10', ['g-frac', 'g-dec']),
      n('g-round', 'Rounding, significant figures and estimating', 'N14, N15', ['g-dec']),
      n('g-bounds', 'Limits of accuracy and error intervals', 'N16', ['g-round']),
      n('g-factors', 'Factors, multiples and primes', 'N4', ['g-ops']),
      n('g-hcflcm', 'HCF, LCM and prime factorisation', 'N4', ['g-factors']),
      n('g-powers', 'Powers and roots', 'N6', ['g-ops']),
      n('g-indices', 'Laws of indices, including negative and fractional', 'N7', ['g-powers']),
      n('g-standard', 'Standard form', 'N9', ['g-indices']),
      n('g-surds', 'Surds', 'N8', ['g-powers']),
      n('g-units', 'Units of money, time, length and mass', 'N13, R1', ['g-dec']),
    ] },
    { strand: 'Ratio and proportion', nodes: [
      n('g-fracof', 'A fraction of an amount; one quantity as a fraction of another', 'R3, N12', ['g-frac']),
      n('g-ratio', 'Ratio notation and sharing in a ratio', 'R4, R5', ['g-fracops']),
      n('g-pct', 'Percentages of an amount', 'R6, N12', ['g-fdp']),
      n('g-pctchange', 'Percentage change, profit and loss', 'R7', ['g-pct']),
      n('g-reversepct', 'Reverse percentages', 'R7', ['g-pctchange']),
      n('g-simpleint', 'Simple interest', 'R7', ['g-pct']),
      n('g-compound', 'Compound interest, growth and decay', 'R16', ['g-pctchange', 'g-powers']),
      n('g-rates', 'Compound units: speed, unit price, density', 'R9', ['g-ratio']),
      n('g-directprop', 'Direct proportion', 'R10', ['g-ratio']),
      n('g-inverseprop', 'Inverse proportion', 'R10, R11', ['g-directprop']),
      n('g-scale', 'Scale factors and scale drawings', 'R2', ['g-ratio']),
      n('g-gradrate', 'Gradient as a rate of change', 'R12', ['g-straight']),
    ] },
    { strand: 'Algebra', nodes: [
      n('g-notation', 'Algebraic notation and substitution', 'A1, A2', ['g-ops']),
      n('g-simplify', 'Simplifying expressions', 'A4', ['g-notation']),
      n('g-expand', 'Expanding brackets', 'A4', ['g-simplify']),
      n('g-factorise', 'Factorising', 'A4', ['g-expand']),
      n('g-quadexpand', 'Expanding double brackets', 'A4', ['g-expand']),
      n('g-quadfactorise', 'Factorising quadratics', 'A4', ['g-factorise', 'g-quadexpand']),
      n('g-lineareq', 'Solving linear equations', 'A17', ['g-notation']),
      n('g-formulae', 'Rearranging formulae', 'A5', ['g-lineareq']),
      n('g-forming', 'Forming and solving equations', 'A21', ['g-lineareq']),
      n('g-inequal', 'Linear inequalities', 'A22', ['g-lineareq']),
      n('g-simul', 'Simultaneous equations', 'A19', ['g-lineareq']),
      n('g-quadsolve', 'Solving quadratic equations', 'A18', ['g-quadfactorise']),
      n('g-seq', 'Sequences and the nth term', 'A23, A24, A25', ['g-notation']),
      n('g-functions', 'Functions', 'A7', ['g-formulae']),
      n('g-coords', 'Coordinates and straight-line graphs', 'A8, A9', ['g-lineareq']),
      n('g-straight', 'Gradient and y = mx + c', 'A10', ['g-coords']),
      n('g-quadgraph', 'Quadratic graphs and their roots', 'A11, A12', ['g-quadsolve', 'g-coords']),
      n('g-othergraphs', 'Cubic, reciprocal and exponential graphs', 'A12, A14', ['g-quadgraph']),
      n('g-realgraphs', 'Real-life graphs: distance and speed', 'A14, A15', ['g-straight']),
    ] },
    { strand: 'Geometry and measures', nodes: [
      n('g-angles', 'Angle facts and parallel lines', 'G3, G4', []),
      n('g-polygons', 'Polygons and their angles', 'G3', ['g-angles']),
      n('g-area', 'Perimeter and area', 'G16, G17', ['g-ops']),
      n('g-circles', 'Circles: circumference, area, arcs and sectors', 'G9, G16', ['g-area']),
      n('g-volume', 'Volume and surface area', 'G16', ['g-area']),
      n('g-pythag', 'Pythagoras\' theorem', 'G20', ['g-powers', 'g-area']),
      n('g-trig', 'Right-angled trigonometry', 'G20, G21', ['g-pythag', 'g-ratio']),
      n('g-sinecos', 'The sine and cosine rules and the area of a triangle', 'G22, G23', ['g-trig']),
      n('g-similar', 'Similarity and congruence', 'G5, G6', ['g-scale']),
      n('g-trans', 'Transformations', 'G7, G8', ['g-coords']),
      n('g-vectors', 'Vectors', 'G24, G25', ['g-coords']),
      n('g-bearings', 'Bearings', 'G15', ['g-angles']),
      n('g-loci', 'Constructions and loci', 'G2, G12', ['g-angles']),
    ] },
    { strand: 'Probability', nodes: [
      n('g-probbasic', 'Probability and the 0 to 1 scale', 'P2, P3, P4', ['g-frac']),
      n('g-probfreq', 'Relative frequency and expected outcomes', 'P1, P5', ['g-probbasic']),
      n('g-probspace', 'Sample spaces, sets and Venn diagrams', 'P6, P7', ['g-probbasic']),
      n('g-probtree', 'Combined events and tree diagrams', 'P8', ['g-probspace']),
      n('g-probcond', 'Conditional probability', 'P9', ['g-probtree']),
    ] },
    { strand: 'Statistics', nodes: [
      n('g-sampling', 'Populations and sampling', 'S1', []),
      n('g-charts', 'Tables, charts and diagrams', 'S2', ['g-ops']),
      n('g-averages', 'Averages and spread', 'S4', ['g-ops']),
      n('g-grouped', 'Grouped data, histograms and cumulative frequency', 'S3, S4', ['g-averages', 'g-charts']),
      n('g-box', 'Quartiles, the interquartile range and box plots', 'S4', ['g-averages']),
      n('g-scatter', 'Scatter graphs and correlation', 'S6', ['g-charts', 'g-straight']),
      n('g-timeseries', 'Time series', 'S2', ['g-charts']),
    ] },
  ];

  const PURE = [
    { strand: 'Proof', nodes: [
      n('p-proofalg', 'Proof by deduction', 'Pure 1', ['p-indices']),
      n('p-proofcontra', 'Proof by exhaustion, counter-example and contradiction', 'Pure 1', ['p-proofalg']),
    ] },
    { strand: 'Algebra and functions', nodes: [
      n('p-indices', 'Laws of indices and surds', 'Pure 2.1', []),
      n('p-quadratics', 'Quadratic functions: completing the square and the discriminant', 'Pure 2.2', ['p-indices']),
      n('p-simul', 'Simultaneous equations, including a quadratic', 'Pure 2.3', ['p-quadratics']),
      n('p-inequalities', 'Linear and quadratic inequalities', 'Pure 2.3', ['p-quadratics']),
      n('p-polynomials', 'Polynomials, the factor theorem and algebraic division', 'Pure 2.4', ['p-quadratics']),
      n('p-algfrac', 'Algebraic fractions and partial fractions', 'Pure 2.4', ['p-polynomials']),
      n('p-functions', 'Functions: domain, range, composite and inverse', 'Pure 2.7', ['p-quadratics']),
      n('p-modulus', 'The modulus function', 'Pure 2.6', ['p-functions']),
      n('p-sketch', 'Sketching graphs: cubics, reciprocals and asymptotes', 'Pure 2.5', ['p-polynomials']),
      n('p-transform', 'Transformations of graphs', 'Pure 2.8', ['p-sketch', 'p-functions']),
    ] },
    { strand: 'Coordinate geometry', nodes: [
      n('p-lines', 'Equations of straight lines', 'Pure 3.1', []),
      n('p-circles', 'Circles', 'Pure 3.2', ['p-lines', 'p-quadratics']),
      n('p-parametric', 'Parametric equations', 'Pure 3.3', ['p-lines']),
    ] },
    { strand: 'Sequences and series', nodes: [
      n('p-binomial', 'The binomial expansion', 'Pure 4.1', ['p-indices']),
      n('p-seq', 'Sequences and recurrence relations', 'Pure 4.2', []),
      n('p-ap', 'Arithmetic series', 'Pure 4.3', ['p-seq']),
      n('p-gp', 'Geometric series', 'Pure 4.3', ['p-seq', 'p-indices']),
      n('p-sigma', 'Sigma notation', 'Pure 4.2', ['p-ap']),
    ] },
    { strand: 'Trigonometry', nodes: [
      n('p-trigratios', 'Sine, cosine and tangent, including exact values', 'Pure 5.1', []),
      n('p-triangles', 'The sine and cosine rules and the area of a triangle', 'Pure 5.1', ['p-trigratios']),
      n('p-radians', 'Radian measure, arcs and sectors', 'Pure 5.2', ['p-trigratios']),
      n('p-trigraphs', 'Graphs of the trigonometric functions', 'Pure 5.3', ['p-radians']),
      n('p-trigeq', 'Solving trigonometric equations', 'Pure 5.6', ['p-trigraphs']),
      n('p-trigid', 'Trigonometric identities', 'Pure 5.4', ['p-trigratios']),
      n('p-trigrecip', 'Reciprocal and inverse trigonometric functions', 'Pure 5.5', ['p-trigid']),
      n('p-trigadd', 'Addition and double-angle formulae', 'Pure 5.7', ['p-trigid']),
      n('p-trigr', 'Writing a sin x + b cos x as R sin(x + a)', 'Pure 5.7', ['p-trigadd']),
      n('p-smallangle', 'Small-angle approximations', 'Pure 5.8', ['p-radians']),
    ] },
    { strand: 'Exponentials and logarithms', nodes: [
      n('p-exp', 'Exponential functions and their graphs', 'Pure 6.1', ['p-indices']),
      n('p-logs', 'Logarithms and their laws', 'Pure 6.2', ['p-exp']),
      n('p-logeq', 'Solving exponential and logarithmic equations', 'Pure 6.3', ['p-logs']),
      n('p-natural', 'The number e and the natural logarithm', 'Pure 6.1, 6.4', ['p-logs']),
      n('p-modelexp', 'Modelling with exponentials and logarithms', 'Pure 6.5', ['p-logeq', 'p-natural']),
    ] },
    { strand: 'Differentiation', nodes: [
      n('p-gradient', 'Gradients of curves and rates of change', 'Pure 7.1', ['p-lines', 'p-functions']),
      n('p-firstprin', 'Differentiation from first principles', 'Pure 7.1', ['p-gradient', 'p-binomial']),
      n('p-diffpowers', 'Differentiating powers of x', 'Pure 7.1, 7.2', ['p-firstprin']),
      n('p-tangents', 'Tangents and normals', 'Pure 7.2', ['p-diffpowers', 'p-lines']),
      n('p-stationary', 'Increasing, decreasing and stationary points', 'Pure 7.3', ['p-diffpowers']),
      n('p-secondderiv', 'The second derivative and concavity', 'Pure 7.3', ['p-stationary']),
      n('p-optimise', 'Optimisation problems', 'Pure 7.3', ['p-secondderiv']),
      n('p-chain', 'The chain rule', 'Pure 7.4', ['p-diffpowers', 'p-functions']),
      n('p-product', 'The product rule', 'Pure 7.4', ['p-diffpowers']),
      n('p-quotient', 'The quotient rule', 'Pure 7.4', ['p-product', 'p-chain']),
      n('p-diffexp', 'Differentiating e^x, a^x and ln x', 'Pure 7.4', ['p-chain', 'p-natural']),
      n('p-difftrig', 'Differentiating sin x and cos x', 'Pure 7.4', ['p-chain', 'p-trigratios', 'p-radians']),
      n('p-difftrig2', 'Differentiating tan x, sec x, cosec x and cot x', 'Pure 7.4', ['p-quotient', 'p-difftrig']),
      n('p-implicit', 'Implicit differentiation', 'Pure 7.4', ['p-chain']),
      n('p-parametricdiff', 'Parametric differentiation', 'Pure 7.4', ['p-chain', 'p-parametric']),
      n('p-connected', 'Connected rates of change', 'Pure 7.5', ['p-chain']),
    ] },
    { strand: 'Integration', nodes: [
      n('p-intpowers', 'Integrating powers of x', 'Pure 8.1', ['p-diffpowers']),
      n('p-intarea', 'Definite integrals and areas under curves', 'Pure 8.2', ['p-intpowers']),
      n('p-intbetween', 'Areas between curves and lines', 'Pure 8.2', ['p-intarea']),
      n('p-inttrigexp', 'Integrating e^x, 1/x and trigonometric functions', 'Pure 8.3', ['p-intpowers', 'p-diffexp', 'p-difftrig']),
      n('p-intsubst', 'Integration by substitution', 'Pure 8.4', ['p-inttrigexp', 'p-chain']),
      n('p-intparts', 'Integration by parts', 'Pure 8.4', ['p-product', 'p-inttrigexp']),
      n('p-intpartfrac', 'Integrating with partial fractions', 'Pure 8.4', ['p-algfrac', 'p-inttrigexp']),
      n('p-diffeq', 'Differential equations', 'Pure 8.5', ['p-inttrigexp']),
      n('p-trapezium', 'The trapezium rule', 'Pure 9.4', ['p-intarea']),
    ] },
    { strand: 'Numerical methods', nodes: [
      n('p-roots', 'Locating roots by a change of sign', 'Pure 9.1', ['p-sketch']),
      n('p-iterate', 'Iterative methods', 'Pure 9.2', ['p-roots']),
      n('p-newton', 'The Newton-Raphson method', 'Pure 9.3', ['p-iterate', 'p-diffpowers']),
    ] },
    { strand: 'Vectors', nodes: [
      n('p-vec2d', 'Vectors in two dimensions', 'Pure 10.1', ['p-trigratios']),
      n('p-vec3d', 'Vectors in three dimensions', 'Pure 10.2', ['p-vec2d']),
      n('p-vecgeom', 'Vectors in geometry and problem solving', 'Pure 10.3', ['p-vec2d']),
    ] },
  ];

  const STATS = [
    { strand: 'Sampling and data', nodes: [
      n('s-sample', 'Sampling: populations, samples and methods', 'Stats 1.1', []),
      n('s-data', 'Presenting and interpreting data, outliers and the large data set', 'Stats 2.1, 2.2', ['s-sample']),
      n('s-measures', 'Measures of location and spread, standard deviation and coding', 'Stats 2.3', ['s-data']),
      n('s-corr', 'Correlation and regression lines', 'Stats 2.4', ['s-measures']),
    ] },
    { strand: 'Probability', nodes: [
      n('s-prob', 'Probability: sets, Venn diagrams and tree diagrams', 'Stats 3.1', []),
      n('s-cond', 'Conditional probability', 'Stats 3.2', ['s-prob']),
      n('s-indep', 'Independent and mutually exclusive events', 'Stats 3.1', ['s-prob']),
    ] },
    { strand: 'Distributions and testing', nodes: [
      n('s-binom', 'The binomial distribution', 'Stats 4.1', ['s-indep']),
      n('s-hypbinom', 'Hypothesis testing with the binomial distribution', 'Stats 5.1', ['s-binom']),
      n('s-normal', 'The normal distribution', 'Stats 4.2', ['s-measures']),
      n('s-normalinv', 'Inverse normal and finding unknown parameters', 'Stats 4.2', ['s-normal']),
      n('s-normbinom', 'Approximating the binomial with the normal', 'Stats 4.3', ['s-binom', 's-normal']),
      n('s-hypcorr', 'Hypothesis testing for correlation', 'Stats 5.2', ['s-corr', 's-hypbinom']),
      n('s-hypmean', 'Hypothesis testing for the mean of a normal distribution', 'Stats 5.3', ['s-normal', 's-hypbinom']),
    ] },
  ];

  const MECH = [
    { strand: 'Kinematics', nodes: [
      n('m-model', 'Quantities, units and modelling assumptions', 'Mech 6.1', []),
      n('m-graphs', 'Kinematic graphs', 'Mech 7.1', ['m-model']),
      n('m-suvat', 'Constant acceleration (suvat)', 'Mech 7.2', ['m-graphs']),
      n('m-vertical', 'Motion under gravity', 'Mech 7.2', ['m-suvat']),
      n('m-varacc', 'Variable acceleration with calculus', 'Mech 7.3', ['m-suvat', 'p-diffpowers']),
      n('m-kinvec', 'Kinematics with vectors', 'Mech 7.3', ['m-varacc', 'p-vec2d']),
      n('m-proj', 'Projectiles', 'Mech 7.4', ['m-vertical', 'p-trigratios']),
    ] },
    { strand: 'Forces and Newton\'s laws', nodes: [
      n('m-forces', 'Forces and resolving into components', 'Mech 8.1', ['m-model', 'p-trigratios']),
      n('m-newton', 'Newton\'s laws and F = ma', 'Mech 8.2', ['m-forces', 'm-suvat']),
      n('m-friction', 'Friction', 'Mech 8.3', ['m-newton']),
      n('m-connected', 'Connected particles and pulleys', 'Mech 8.4', ['m-newton']),
      n('m-inclined', 'Motion on an inclined plane', 'Mech 8.3', ['m-friction']),
      n('m-moments', 'Moments and equilibrium', 'Mech 9.1', ['m-forces']),
    ] },
  ];

  const MAPS = [
    { id: 'gcse', subject: 'gcse', title: 'GCSE Maths', board: 'Edexcel 1MA1', strands: GCSE },
    { id: 'pure', subject: 'alevel', title: 'Pure Mathematics', board: 'Edexcel 9MA0', strands: PURE },
    { id: 'stats', subject: 'alevel', title: 'Statistics', board: 'Edexcel 9MA0', strands: STATS },
    { id: 'mech', subject: 'alevel', title: 'Mechanics', board: 'Edexcel 9MA0', strands: MECH },
  ];
  const NODES = {};
  MAPS.forEach((m) => m.strands.forEach((s) => s.nodes.forEach((nd) => { nd.map = m.id; nd.strand = s.strand; NODES[nd.id] = nd; })));
  // the map a student studying this subject sees: GCSE Maths is one map; A-level Maths is the three
  FM.knowledgeMaps = (subject) => MAPS.filter((m) => m.subject === (subject === 'alevel' || subject === 'above' ? 'alevel' : 'gcse'));
  FM.knowledgeNode = (id) => NODES[id] || null;
  FM.knowledgeAllNodes = () => Object.keys(NODES).map((k) => NODES[k]);
  // how deep a node is: the longest chain of points that has to come before it
  const depthCache = {};
  FM.knowledgeDepth = function depth(id) { if (depthCache[id] != null) return depthCache[id]; const nd = NODES[id]; const d = nd && nd.pre.length ? 1 + Math.max.apply(null, nd.pre.map((p) => NODES[p] ? depth(p) : 0)) : 0; return (depthCache[id] = d); };
})();
