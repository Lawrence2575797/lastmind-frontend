/*
 * Be the Chancellor: the economics behind the game, written out.
 *   LMGuide.lever(id)      what a policy lever does to the economy, who gains and loses, and what to watch for
 *   LMGuide.situation(key) what is going on in each starting situation, how it got there and what usually helps
 *   LMGuide.GLOSSARY       short explanations of the ideas the game keeps using
 * All hand-written, so nothing here costs anything or changes between visits. Plain text only.
 */
(function (root) {
  var LEVERS = {
    // Income and business tax
    inc_basic: 'Cutting the basic rate leaves most workers with more take-home pay, so they spend more and the economy gets a boost, but the Treasury collects less. Raising it does the reverse. It touches almost every household, so it is both powerful and very visible.',
    inc_top: 'A higher top rate raises money from the best-off with little effect on total spending, because they save more of each extra pound. Set it too high and some work less, move or avoid tax, so revenue stops rising.',
    allowance: 'Raising the tax-free threshold takes the lowest earners out of tax and helps them most as a share of income. It costs more than it looks, because everyone above the threshold gains too.',
    corp: 'Lower corporation tax leaves firms with more profit to invest, hire and attract foreign investment, but costs revenue and gives the most to shareholders. Raising it does the opposite and can push investment abroad.',
    inv_allow: 'Letting firms deduct investment from taxable profit lowers the cost of new machinery and buildings. It boosts investment and long-run productivity at a lower cost than a general corporation tax cut, because it only pays for spending that happens.',
    rd_credit: 'Credits for research and development lower the cost of innovating. They raise productivity growth over many years, not quarters, and the cost is modest.',
    // Consumption and wealth taxes
    vat: 'VAT is paid on almost everything people buy, so it raises a lot of money quickly. It takes a bigger share of poorer households\' income and pushes prices up. Cutting it lowers prices and boosts spending, but costs a lot.',
    duties: 'Duties on goods like alcohol, tobacco and fuel raise revenue and discourage the activity taxed, and fall hardest on those who buy the most. They also change inflation a little.',
    property: 'Property or land taxes are hard to dodge, because land cannot move. They raise steady revenue and can cool house prices, but they hit owners, including older people with little cash income.',
    cgt: 'Capital-gains tax falls on profits from selling assets. A higher rate raises money from the wealthy and can cool asset markets, but may make investors hold on to assets rather than sell.',
    inherit: 'Taxing inheritance or wealth raises revenue from the very rich and reduces inequality across generations. It has little effect on spending in the short run, and can encourage wealth to move or be hidden.',
    // Spending
    health: 'More health spending improves services and employs people, and the extra demand lifts the economy. Cuts save money but lengthen waiting times, and voters notice quickly.',
    education: 'Education spending pays off slowly, through a more skilled workforce, while employing teachers now. Cuts save money in the short run and cost growth years later.',
    defence: 'Defence spending creates jobs and orders but does little for long-run productivity. It rises and falls with security threats and is hard to cut in a crisis.',
    policing: 'Spending on police and courts affects safety and public trust. It supports jobs and demand directly, with little effect on growth.',
    local: 'Money for local government is spent on local services, roads and care. It cushions regions that are hit hardest by a downturn.',
    pay: 'Raising public-sector pay boosts spending and helps recruit and keep staff, but it is a permanent cost, and can push up pay across the whole economy and so raise inflation.',
    // Welfare
    unemp_ben: 'Higher unemployment benefit cushions people who lose their jobs and, because they spend most of it, it supports demand in a slump. It can weaken the push to find work if it is too generous.',
    pensions: 'Pensions are the biggest welfare bill in many countries. Raising them helps pensioners, who spend nearly all of it, but the cost grows as the population ages and is hard to reverse.',
    child_ben: 'Child and family benefits reduce child poverty and help parents stay in work. They go to households that spend most of what they receive, so they give a good boost to demand per pound.',
    housing_support: 'Housing support lowers rent burdens for low earners. If housing supply is short, some of the money ends up as higher rents rather than a better standard of living.',
    ubi: 'A universal payment to everyone is simple and supports demand, because poor households spend most of it. It is very expensive, and paid for by borrowing it can raise prices.',
    // Infrastructure and energy
    inf_roads: 'Road building creates jobs now and lowers transport costs later, raising productivity over the years. It takes time to plan and build, so it helps slowly, but with lasting effect.',
    inf_rail: 'Rail and public transport investment cuts congestion and links labour markets. It is costly and slow, with benefits that build over decades.',
    inf_ports: 'Ports and logistics speed up trade and cut costs for exporters and importers. They matter most for economies that depend on trade.',
    inf_digital: 'Broadband and digital investment raises productivity across almost every sector, especially services and small firms, and the returns grow as more people connect.',
    inf_water: 'Water systems protect health and let farming and industry grow. The benefits are large in poorer economies, where missing infrastructure holds back growth.',
    inf_housingInfra: 'Roads, power and water to new housing sites make building possible. It supports housebuilding and helps ease price rises over time.',
    renew: 'Investment in renewables creates jobs now and lowers energy costs and import bills later. It reduces exposure to oil and gas price shocks, but pays back over many years.',
    nuclear: 'Nuclear is very expensive and slow, but gives stable power for decades. It cuts dependence on imported energy and creates skilled jobs, with benefits far in the future.',
    fossil: 'Expanding fossil-fuel production boosts output, exports and tax revenue in the short run, and shields against energy price spikes. It raises emissions and risks stranded assets.',
    grid: 'Grid investment lets more power flow where it is needed, supporting new industry and renewables. It is rarely noticed by voters but unblocks growth.',
    hh_energy_sub: 'Paying part of household energy bills cuts measured inflation and protects living standards when prices spike. It is costly, keeps demand for energy high, and is hard to withdraw.',
    biz_energy_sub: 'Energy support for businesses protects jobs in energy-heavy industry during a price spike. It costs the Treasury and delays firms adjusting to higher prices.',
    // Human capital
    hc_school: 'Investment in schools raises skills for a generation. The payoff is very large but arrives in 10 to 20 years.',
    hc_university: 'University funding raises high-skill workers and research. The benefits take years, and mostly go to graduates and growth-driving industries.',
    hc_vocational: 'Apprenticeships and technical training move people into jobs employers need, and cut skill shortages sooner than universities do.',
    hc_adult: 'Retraining helps workers whose jobs have vanished to move into new ones. It reduces long-term unemployment, but works best when jobs are available.',
    hc_earlyYears: 'Early childhood support has some of the highest long-run returns of any spending, and helps parents work, but its results take decades to show.',
    // Labour market
    min_wage: 'A higher minimum wage lifts the pay of the lowest earners and their spending. If set well above what workers produce, it can cost jobs, especially for young or low-skilled workers, and raise prices.',
    emp_sub: 'Paying firms to employ people cuts unemployment fast and helps the hardest to employ, but costs money and some of it pays for jobs that would have existed anyway.',
    hire_credit: 'A tax credit for hiring cuts the cost of taking on staff, which helps recovery from a slump. It works best if time-limited.',
    epl: 'Stronger employment protection makes jobs more secure, but makes firms more careful about hiring. Weaker protection speeds hiring and firing, which can lower unemployment but increase insecurity.',
    worktime: 'Stricter working-time rules protect workers\' health and leisure but raise costs for employers. Looser rules do the reverse.',
    unions: 'Stronger unions raise pay and bargaining power for members and cut inequality. They can also raise wages faster than productivity, which pushes up prices and unemployment.',
    retire: 'A higher retirement age raises the workforce and cuts pension costs over time. It is unpopular and falls hardest on people in physical jobs.',
    // Business and supply side
    biz_subsidy: 'Subsidising a sector protects its jobs and lifts its output, but costs money, weakens pressure to improve, and can distort where investment goes.',
    sme: 'Supporting small firms helps them survive and hire, and boosts competition. It is hard to target well, and some goes to firms that would have done fine.',
    dereg: 'Cutting rules lowers costs and speeds up new business. It raises growth over time, but can reduce protections for workers, consumers or the environment.',
    compete: 'Enforcing competition law lowers prices and pushes firms to improve, which raises productivity over time. Large incumbents will resist it.',
    privatise: 'Selling state firms raises cash now and may make them more efficient, but gives up future income and, if the firm is a monopoly, can mean higher prices for customers.',
    nationalise: 'Taking firms into state ownership gives control over prices and jobs but costs money, and the state may run them less efficiently.',
    planning: 'Easier planning rules let firms and homes be built faster. It raises supply and growth, with local opposition as the cost.',
    ent_zones: 'Tax breaks in chosen areas draw firms to poorer regions. Some jobs are only moved from elsewhere, so the net gain is smaller than it looks.',
    // Innovation
    gov_rd: 'Government research spending produces knowledge that private firms will not pay for. It raises productivity growth over a decade or more.',
    priv_rd: 'Subsidising firms\' research encourages more of it. It works when firms would not otherwise pay for it, and costs money when they would.',
    adoption: 'Helping firms adopt proven technology lifts productivity faster than inventing new technology, especially in lagging firms.',
    univ_ind: 'Linking universities and industry turns research into products. It pays off slowly and unevenly.',
    // Housing
    housebuild: 'Government housebuilding adds homes, creates construction jobs now and eases rents and prices as supply grows. It is costly and slow to start.',
    plan_lib: 'Loosening planning rules lets more homes be built where people want to live. It is cheap for the government and slows house-price growth over time.',
    first_buyer: 'Helping first-time buyers pay lifts demand for homes. If supply is short, much of the help is passed on as higher house prices.',
    rent_reg: 'Rent controls lower rents for tenants now, but can cut the supply of rented homes and their upkeep over time.',
    prop_struct: 'Changing how property is taxed can cool a housing boom or encourage building. It shifts the burden between owners, buyers and renters.',
    // Trade
    tariff: 'A tariff raises the price of imports, protecting local producers and raising revenue. Consumers pay more, trading partners may retaliate, and firms that need imported parts lose out.',
    tariff_cut: 'Removing tariffs makes imports cheaper and puts pressure on local firms to improve. Consumers gain, but protected industries lose jobs before new ones appear.',
    quota: 'Limiting imports protects local firms but pushes prices up and cuts choice. Quotas are blunter than tariffs and bring no revenue.',
    export_sub: 'Supporting exporters boosts sales abroad and jobs, but costs money and may provoke trade disputes.',
    fta: 'A trade deal opens partners\' markets to your exporters and cheapens imports. The gains build over years, and some sectors lose.',
    customs: 'A customs union removes tariffs among members and sets common ones outside. It deepens trade but limits your freedom to set trade policy.',
    sanctions: 'Restricting trade with another country is a political tool. It costs your own exporters and importers, and can raise prices.',
    // Foreign investment
    fdi_inc: 'Incentives for foreign investors bring capital, jobs and know-how. They cost revenue, and the benefit depends on whether the investment is really new.',
    fdi_own: 'Limits on foreign ownership protect strategic firms and national control, but reduce the capital and skills foreign investors bring.',
    fdi_screen: 'Screening foreign takeovers protects sensitive industries, at the price of slower, less certain investment.',
    sez: 'Special zones with low taxes and light rules draw factories and exports. They work best with good ports and power, and can leave the rest of the country behind.',
    // Industrial policy
    strat_sub: 'Backing strategic industries aims to build skills and supply chains the country wants. It is expensive and risks backing losers.',
    procure: 'Buying from domestic firms supports local jobs, at the price of higher costs if they are less competitive.',
    mfg: 'A manufacturing strategy supports factories, skills and exports. It can raise productivity and jobs, but costs money and takes years.',
    green_ind: 'Supporting green industries builds new sectors and jobs while cutting emissions. It costs money upfront and the payoff depends on global demand.',
    // Environment
    carbon: 'A carbon tax raises the cost of polluting, cutting emissions and raising revenue. It raises energy prices, so it is felt as higher inflation and hits poorer households hardest unless compensated.',
    ets: 'Emissions trading caps total pollution and lets firms trade permits. It cuts emissions at the lowest cost, and raises energy prices like a carbon tax.',
    green_sub: 'Subsidies for green technology lower its cost and speed adoption. They cost money and may pay for things that would have happened anyway.',
    poll_reg: 'Pollution rules protect health and the environment. They raise costs for polluting firms and can slow some investment.',
    fuel_duty: 'Fuel duty raises steady revenue and discourages driving. Raising it pushes up transport costs and inflation, and cutting it is popular but costly.',
    green_pub: 'Public green investment, in things like flood defences and clean power, creates jobs now and protects the economy from future damage.',
    // Regional
    reg_inv: 'Investing in lagging regions creates jobs where they are most needed and narrows regional gaps. It is slow, and may be less productive than investing in busy places.',
    reg_tax: 'Tax breaks for a region attract firms and jobs there, though some are simply moved from other places.',
    infra_redis: 'Moving infrastructure spending towards lagging regions helps them catch up, but takes it from places where it might earn more.',
    relocation: 'Moving public jobs out of the capital spreads wealth and can cut costs. Disruption is the price in the short run.',
    // Migration and labour supply
    mig_skilled: 'Letting in more skilled workers fills shortages, raises output and tax revenue and adds to demand. It can strain housing and public services in the short run.',
    mig_general: 'More general migration adds workers and eases labour shortages, and holds down wage pressure. It also adds demand for housing and services.',
    mig_students: 'International students bring fees and spending, and some stay as skilled workers. It supports universities, with pressure on local housing.',
    childcare: 'Subsidised childcare lets more parents, especially mothers, work. It raises the workforce and tax revenue, which offsets some of the cost.',
    // Monetary
    rate: 'The policy rate sets the cost of borrowing. Raising it cools spending, house prices and inflation but slows growth and raises unemployment. Cutting it does the reverse, with a delay of a year or more. Usually the central bank sets it, not the Chancellor.',
    cb_indep: 'An independent central bank is trusted to keep inflation low, which anchors expectations. Letting the government direct it, or print money to pay its bills, can feed inflation.',
    qe: 'The central bank creates money to buy bonds, which lowers long-term interest rates and supports lending when rates cannot fall further. Too much can fuel asset prices and inflation.',
    qt: 'Selling bonds back withdraws money and pushes long-term rates up. It tightens credit and cools inflation, and weakens the bond market if done fast.',
    reserve_req: 'Making banks hold more reserves limits how much they can lend. It cools credit and inflation, but squeezes borrowers and bank profits.',
    credit_ctrl: 'Direct limits on lending cool a credit boom quickly, but are a blunt tool which can push borrowing into unregulated places.',
    // Exchange rate
    fx_int: 'Using reserves to buy your own currency props it up, which cuts import prices and inflation. It only works while reserves last, and speculators can overwhelm it.',
    fixed_fx: 'Fixing the exchange rate gives stable prices for trade and can anchor inflation. It means giving up control of interest rates, and needs reserves to defend it.',
    devalue: 'A weaker currency makes exports cheaper and imports dearer. It boosts exports and jobs, but raises inflation and the cost of foreign debt.',
    cap_ctrl: 'Limiting money flowing in or out stops a run on the currency in a crisis. Investors lose confidence and future investment may dry up.',
    // Banking and finance
    guarantee: 'A deposit guarantee tells savers their money is safe, which stops bank runs. It costs nothing unless banks fail, and can encourage banks to take more risk.',
    bailout: 'Putting public money into failing banks keeps credit flowing and stops the system seizing up. It is costly to taxpayers and can reward bad lending.',
    bank_nat: 'Taking a bank into public ownership gives control and calms depositors. It puts the risk of its loans on the state.',
    bank_cap: 'Making banks hold more capital makes them safer but cuts lending in the short run. Looser rules do the opposite and raise the risk of a crisis.',
    mortgage: 'Limits on mortgage lending cool a housing boom and protect borrowers from taking on too much debt. They also shut some buyers out.',
    fin_reg: 'Tighter financial rules lower the risk of a crisis, and can raise the cost of credit and slow lending.',
    // Fiscal framework
    fiscal_rule: 'A fiscal rule limits borrowing, which reassures lenders and helps keep interest rates down. It also limits what you can do in a slump unless it has an escape clause.',
    debt_target: 'A debt target sets a goal for debt as a share of GDP. It reassures markets, and forces choices about tax and spending to get there.',
    def_target: 'A deficit target caps annual borrowing. It signals discipline, and makes it harder to respond to a downturn.',
    spend_ceil: 'A spending ceiling limits government spending as a share of GDP. It controls the size of the state, and may force cuts to services.',
    emerg_budget: 'An emergency budget is a rapid package of tax and spending changes. Austerity cuts the deficit and calms lenders but deepens a slump; stimulus does the reverse.',
    // Debt management
    debt_issue: 'Issuing more debt pays for spending now, and pushes interest rates up if lenders get nervous. It leaves a bigger bill for the future.',
    maturity: 'Borrowing for longer protects you from sudden rises in interest rates, but long-term borrowing usually costs more each year.',
    fx_borrow: 'Foreign-currency debt is usually cheaper, but if your currency falls the debt gets heavier. It is a common cause of debt crises.',
    restructure: 'Cutting what the state owes lowers the debt burden at once. Lenders will charge more for new borrowing, and the country may be shut out of markets for a while.',
    // Development
    dev_aid: 'Development programmes raise health, schooling and incomes in poor regions. They cost money and the benefits come over years.',
    rural_inf: 'Rural roads and services connect farmers to markets and raise incomes where most poor people live.',
    electrify: 'Getting electricity to homes and firms lets them work longer, use machines and start businesses. It has some of the highest returns in a low-income economy.',
    sanitation: 'Clean water and sanitation reduce disease, which raises health, school attendance and productivity.',
    agri_inv: 'Investing in farming raises yields and incomes in economies where agriculture is a big part of output, and steadies food prices.',
    microfin: 'Small loans to micro-businesses help the poorest start and grow firms. The impact depends on repayment and good management.',
    // Agriculture and food
    agri_sub: 'Subsidising farmers keeps farms going and food supply steady. It costs money and can overproduce or keep inefficient farms alive.',
    food_sub: 'Lowering food prices helps poor households most and cuts measured inflation. It is costly and hard to end.',
    food_reserve: 'Holding food stocks smooths price spikes in bad harvests. Storing costs money, and releasing stocks helps when prices jump.',
    agri_tariff: 'Tariffs on farm imports protect local farmers and raise food prices for everyone else.',
    // Crisis controls
    price_cap: 'A temporary price cap holds prices down for a time, cutting measured inflation. It can lead to shortages and has to be paid for, and when it ends prices can jump.',
    temp_tax: 'A temporary tax cut gives a quick boost to spending in a slump. Because it is one-off, people spend less of it than a permanent cut, and it costs less over time.',
    hh_payments: 'One-off payments to households boost demand fast in a downturn and protect the poorest. They are costly, and unless spent on, they have a short-lived effect.',
    furlough: 'Paying part of workers\' wages to stay employed prevents mass unemployment in a shock. It is costly while it runs and can keep jobs alive that no longer have a future.',
    biz_grants: 'One-off grants keep firms afloat through a shock. They are costly, and some go to firms that would have survived.',
    loan_guar: 'Guaranteeing business loans gets credit flowing in a crisis. It costs nothing unless borrowers default, then the state pays.',
    rationing: 'Rationing shares out scarce goods when prices cannot. It protects the poor in a shortage, but is hard to run and creates black markets.',
    emerg_nat: 'Taking a firm into emergency public ownership protects critical services and jobs in a crisis. The state takes on its losses.',
  };

  var AREA_FALLBACK = 'This changes incentives and spending in the economy. Look at who gains and who pays, how long it takes to work, and what it does to the budget deficit.';

  // What is going on in each starting situation.
  var SITUATIONS = {
    stable: { title: 'A well-run economy', how: [
      'Growth is steady, prices are close to target and unemployment is low. There is no emergency, so the risk is drift: debts creeping up, services stretching and voters getting restless.',
      'In calm times the job is to prepare. Keep the public finances in a state where you could afford to respond to a shock, and invest in things that raise long-run growth, such as skills, infrastructure and research.' ],
      watch: ['Debt as a share of GDP', 'The gap between growth and interest rates', 'Whether wages are keeping up with prices'], levers: ['Infrastructure', 'Human capital', 'Fiscal framework'], focus: ['inf_roads', 'hc_vocational', 'fiscal_rule', 'inv_allow'] },
    slump: { title: 'Deep slump', how: [
      'A shock has cut spending and output. Firms stop investing, workers lose jobs, and falling incomes cut spending further, so the slump feeds itself.',
      'When private spending falls, government spending can fill the gap. Extra spending or tax cuts raise output by more than they cost when there is spare capacity, because the money is spent and re-spent. The worry is debt, so spending that creates jobs now and lasts is best.' ],
      watch: ['Unemployment and the output gap', 'Debt and the cost of borrowing', 'Business confidence'], levers: ['Government spending', 'Infrastructure', 'Crisis controls', 'Labour market'], focus: ['hh_payments', 'inf_roads', 'emp_sub', 'emerg_budget', 'hire_credit'] },
    overheating: { title: 'Overheating boom', how: [
      'Spending is growing faster than the economy can produce. Credit is cheap, house prices are racing and firms struggle to hire. That pushes wages and prices up.',
      'Booms end in one of two ways: you cool demand in a controlled way, or it bursts. Higher taxes, lower spending and tighter lending cool the economy, which is unpopular in good times, but cheaper than a crash.' ],
      watch: ['Inflation against target', 'House prices and credit growth', 'The budget deficit in a boom'], levers: ['Banking and finance (mortgage rules)', 'Income tax', 'Government spending', 'Monetary'], focus: ['mortgage', 'vat', 'inc_basic', 'health', 'fiscal_rule'] },
    'banking-crisis': { title: 'Banking crisis', how: [
      'Banks have lent to people and firms who cannot repay. Nobody knows which banks are safe, so they stop lending, and savers may start withdrawing. Without credit, firms cannot invest and the economy shrinks.',
      'The first job is to stop panic: guarantee deposits and show that failing banks will be dealt with. Bailing out banks costs taxpayers and rewards mistakes, but letting the system collapse costs far more. After the rescue, tighten the rules.' ],
      watch: ['Lending and unemployment', 'The cost of the rescue', 'Confidence of savers and investors'], levers: ['Banking and finance', 'Crisis controls', 'Fiscal framework'], focus: ['guarantee', 'bailout', 'bank_cap', 'loan_guar', 'fin_reg'] },
    'debt-crisis': { title: 'External debt crisis', how: [
      'The government owes a lot, much of it in foreign currency, and reserves are thin. When the currency falls, the debt gets heavier. Lenders worry, charge more, and the interest bill grows, so the problem feeds itself.',
      'You have to restore trust. That can mean cutting the deficit, restructuring the debt, lengthening repayments or borrowing in your own currency. Every step has a cost, and the quicker you act, the cheaper it is.' ],
      watch: ['Interest costs', 'The currency', 'Reserves and the size of the deficit'], levers: ['Debt management', 'Fiscal framework', 'Exchange rate', 'Government spending'], focus: ['restructure', 'maturity', 'def_target', 'emerg_budget', 'fx_borrow'] },
    'commodity-bust': { title: 'Commodity bust', how: [
      'The country depends on one export, and its price has collapsed. Incomes, tax revenue and the currency all fall together. Imports become dearer just as the budget shrinks.',
      'A weaker currency helps other exports, but raises inflation. In the long run the answer is to diversify: invest in other industries, skills and infrastructure, and build savings for the next bust. In the short run you must protect the budget without starving growth.' ],
      watch: ['The budget deficit', 'The currency', 'Jobs outside the commodity sector'], levers: ['Exchange rate', 'Industrial policy', 'Infrastructure', 'Fiscal framework'], focus: ['devalue', 'fx_int', 'mfg', 'inf_ports', 'def_target'] },
    hyperinflation: { title: 'Hyperinflation', how: [
      'Prices rise by the month. The government cannot borrow, so the central bank prints money to pay its bills, and that creates more inflation. People spend money the day they get it, which makes prices rise faster.',
      'To stop it, three things must happen together: the government must stop financing its deficit with printed money, the deficit must close, and people must believe it. An independent central bank, a credible budget and a stable currency are the heart of any stabilisation. Partial measures fail.' ],
      watch: ['Inflation and money printing', 'The deficit', 'The currency'], levers: ['Monetary (central bank independence)', 'Fiscal framework', 'Exchange rate', 'Crisis controls'], focus: ['cb_indep', 'emerg_budget', 'rate', 'fixed_fx', 'def_target'] },
  };

  var GLOSSARY = [
    ['Inflation', 'The rate at which prices rise. A little (around 2 to 4%) is normal. High inflation erodes savings and wages, and makes planning hard.'],
    ['Deficit and debt', 'The deficit is how much more the government spends than it collects in a year. Debt is the total built up over the years. Debt falls as a share of GDP if the economy grows faster than debt does.'],
    ['Real interest rate', 'The interest rate minus inflation. It is what borrowing really costs. A high real rate slows spending; a negative one encourages it.'],
    ['The multiplier', 'When the government spends a pound, it becomes someone\'s income, who spends part of it, and so on. In a slump, with spare capacity, a pound of spending can add more than a pound to output. At full employment it mainly raises prices.'],
    ['Crowding out', 'When the government borrows a lot, it competes with firms for savings and pushes up interest rates, so private investment falls. It matters most when the economy is already running at full speed.'],
    ['Exchange rate pass-through', 'When the currency falls, imports cost more, and those costs feed into prices. The more a country imports, the faster and bigger the effect.'],
    ['Lags', 'Policies take time to work. Taxes can act within months; infrastructure and education take years. Plan for the situation in two years, not just today\'s.'],
    ['One-off and permanent measures', 'A permanent change alters people\'s plans, so they adjust spending to match. A one-off payment is mostly saved or used to pay debts, so it boosts spending by less per pound, but costs less in the long run. One-off measures suit shocks that you expect to pass.'],
    ['Expectations', 'What people expect to happen shapes what they do. If they expect high inflation, they ask for higher wages and raise prices, and it comes true. Credible policy changes expectations.'],
  ];


  // Short notes tied to the decision in front of the student: one question to ask, and what moves. Never the answer.
  var AREA_NOTES = {
    'Income tax': 'Ask: is spending too weak, or too strong? Cutting income tax lifts demand and costs revenue; raising it does the reverse. It takes about two quarters to bite.',
    'Business tax': 'Ask: do you want firms to invest, or to pay more? Lower taxes can raise investment and cost revenue. The gain comes over years, not quarters.',
    'Consumption tax': 'Ask: do you need revenue fast, or lower prices? VAT raises a lot quickly, but pushes prices up and takes more from poorer households.',
    'Wealth and property': 'Ask: who can afford to pay, and does it cool a housing boom? These taxes are hard to dodge but raise money slowly and are politically sensitive.',
    'Government spending': 'Ask: is there spare capacity? In a slump spending lifts output; in a boom it mostly lifts prices. Check the deficit before you commit.',
    'Welfare': 'Ask: who spends the money? Low-income households spend most of what they get, so welfare supports demand. It is hard to reverse.',
    'Human capital': 'Ask: how patient can you be? Skills and schooling raise growth for decades, but cost money now and show up after the election.',
    'Infrastructure': 'Ask: do you need jobs now, or productivity later? Building creates work quickly and lowers costs for years, but projects take time to start.',
    'Energy': 'Ask: how exposed are you to energy prices? Investment shields you from future spikes. Subsidies ease today\'s bills but cost money and keep demand high.',
    'Environment': 'Ask: who pays? A carbon tax cuts emissions but raises energy prices, which feeds inflation and hits poorer households unless you compensate them.',
    'Housing': 'Ask: is supply or demand the problem? More homes ease prices slowly. Helping buyers with money often just lifts prices.',
    'Labour market': 'Ask: do you want jobs, or pay, to rise? A higher wage floor helps low earners but can cost jobs. Strong protection makes jobs secure but hiring slower.',
    'Migration and labour supply': 'Ask: are firms short of workers? More workers ease wage pressure, but add demand for housing and services.',
    'Regional': 'Ask: is the gap between places the problem? Regional money creates local jobs but may earn less than spending where firms already cluster.',
    'Business and supply side': 'Ask: what is holding firms back? Cutting red tape and boosting competition raise growth slowly. Subsidies cost money now.',
    'Innovation': 'Ask: do you have ten years? Research spending raises productivity, with almost no effect inside this term.',
    'Trade': 'Ask: who gains and who loses? Tariffs protect some jobs but raise prices and invite retaliation. Trade deals help exporters over years.',
    'Foreign investment': 'Ask: do you need capital more than control? Incentives bring investment and jobs but cost revenue. Restrictions protect key firms.',
    'Industrial policy': 'Ask: can a government pick winners? Backing industries builds skills but is expensive and risks backing the wrong ones.',
    'Monetary': 'Ask: is inflation or growth the bigger worry? Higher rates cool prices and demand, with a delay of a year or more. Printing money is a last resort and feeds inflation.',
    'Exchange rate': 'Ask: what does a weaker currency do to you? It helps exporters, but raises import prices and the cost of any foreign-currency debt.',
    'Banking and finance': 'Ask: is the problem lending, or confidence? Rescues stop panic but cost taxpayers. Tighter rules make banks safer but slow lending.',
    'Fiscal framework': 'Ask: do lenders trust you? Rules and targets reassure markets but limit what you can do in a slump unless they allow exceptions.',
    'Debt management': 'Ask: when does the debt fall due, and in which currency? Longer, home-currency debt is safer. Restructuring cuts the burden but shuts you out of markets for a while.',
    'Development': 'Ask: where are the biggest gaps? Basic services pay back most in poorer economies, but over years.',
    'Agriculture and food': 'Ask: is the problem prices or supply? Subsidies hold prices down but cost money. Reserves smooth out bad harvests.',
    'Crisis controls': 'Ask: will this pass? One-off help (payments, grants, furlough) cushions a shock for less than a permanent measure. Price caps risk shortages.',
  };
  var STEP_NOTES = {
    question: 'Before you look at any data, write down what you expect, and what would change your mind. Ask what you could compare this policy with.',
    data: 'Look at how the adopting countries differed before they acted, not only after. That gap is what a fair method has to deal with.',
    evidence: 'Several methods beat one. Start with the simplest, then ask what each one assumes.',
    cba: 'Ask what you are weighing: extra output against the cost of extra borrowing, in today\'s money. Change one assumption and see whether the answer flips.',
    decide: 'Give a best guess and a range. A range that is too narrow is overconfidence; one that is too wide says nothing.',
  };
  var METHOD_NOTES = {
    before: 'Compares each country with itself. Ask what else changed over that time.',
    did22: 'Compares adopters with non-adopters. It assumes they would have moved in parallel without the policy.',
    twfe: 'The same idea as a regression, with standard errors. Ask whether the countries adopted at different dates.',
    event: 'Shows the effect quarter by quarter. Look to the left of the dotted line first: before adoption it should be flat.',
    synth: 'Builds a stand-in country from the ones that did nothing. Check how well it fits before adoption.',
    ri: 'Asks how often chance alone gives a result this big. It says nothing about whether the comparison was fair.',
    home: 'Your own country has tried this before. Compare it with itself, then with the countries that did nothing, and ask whether it agrees with them.',
  };
  // The situation, as short cards. `area` links to the part of the Policy tab the card is about.
  var CARDS = {
    overheating: [
      { t: 'What is happening', b: 'Spending is growing faster than the economy can produce. Credit is cheap, house prices are climbing, and wages and prices are being pushed up.' },
      { t: 'Your real choice', b: 'Cool it gently now, or risk a crash later. Cooling is unpopular while times feel good, which is why booms are hard to stop.' },
      { t: 'Where the pressure comes from', b: 'Look at credit and housing first. It is easier to tighten lending than to change everyone\'s taxes.', area: 'Banking and finance' },
      { t: 'Tools that cool demand', b: 'Higher taxes or lower spending cool demand, but take a couple of quarters to work and cost votes.', area: 'Income tax' },
      { t: 'Keep an eye on', b: 'Inflation against the target, and the budget deficit, which should be falling in a boom, not growing.' },
    ],
    stable: [
      { t: 'What is happening', b: 'Growth is steady, prices are on target and unemployment is low. There is no emergency.' },
      { t: 'The risk', b: 'Complacency. Debt is high and the population is ageing, so a shock would be costly.' },
      { t: 'Prepare for later', b: 'Spending on skills, roads and research raises long-run growth, but the results arrive after the election. Weigh that.', area: 'Infrastructure' },
      { t: 'Keep room to respond', b: 'A fiscal rule, or falling debt, gives you room to act in a future crisis.', area: 'Fiscal framework' },
      { t: 'Keep an eye on', b: 'Debt as a share of GDP, and whether growth is outpacing the interest you pay.' },
    ],
    slump: [
      { t: 'What is happening', b: 'Spending has fallen after a shock, firms have stopped investing and workers are losing jobs, which cuts spending further.' },
      { t: 'Your real choice', b: 'Do you let it mend slowly, or step in with spending and take on debt? Stepping in works best when there is spare capacity.' },
      { t: 'Help that acts fast', b: 'Payments to households and grants to firms work quickly. Building takes longer but lasts.', area: 'Crisis controls' },
      { t: 'The cost', b: 'Debt is already high. For each pound of help, ask what it buys in jobs.', area: 'Government spending' },
      { t: 'Keep an eye on', b: 'Unemployment, and what it costs the government to borrow.' },
    ],
    'banking-crisis': [
      { t: 'What is happening', b: 'Banks have lent to people who cannot repay. Nobody knows which banks are safe, so lending is freezing.' },
      { t: 'The first job', b: 'Stop the panic. Savers need to believe their deposits are safe.', area: 'Banking and finance' },
      { t: 'The trade-off', b: 'Rescuing banks costs taxpayers and can reward bad lending. Letting them fail can freeze the whole economy.' },
      { t: 'After the rescue', b: 'Tighter rules make banks safer but slow lending, so time them.' },
      { t: 'Keep an eye on', b: 'Lending, unemployment and confidence among savers and investors.' },
    ],
    'debt-crisis': [
      { t: 'What is happening', b: 'The government owes a lot, much of it in foreign currency, and reserves are thin. A weak currency makes the debt heavier.' },
      { t: 'Why it feeds itself', b: 'Lenders worry, charge more, and the interest bill grows, which worries them more.' },
      { t: 'Rebuilding trust', b: 'A credible budget and a fiscal rule matter more than any single cut.', area: 'Fiscal framework' },
      { t: 'Debt tools', b: 'Longer maturities, less foreign borrowing, or restructuring: each has a price.', area: 'Debt management' },
      { t: 'Keep an eye on', b: 'Interest costs, the currency, and reserves.' },
    ],
    'commodity-bust': [
      { t: 'What is happening', b: 'One export has collapsed in price, so incomes, tax revenue and the currency are all falling together.' },
      { t: 'In the short term', b: 'Protect the budget without starving growth. A weaker currency helps other exporters but raises prices.', area: 'Exchange rate' },
      { t: 'In the long term', b: 'Diversify: other industries, skills, infrastructure.', area: 'Industrial policy' },
      { t: 'Save next time', b: 'Rules that save in the good years protect you in the next bust.', area: 'Fiscal framework' },
      { t: 'Keep an eye on', b: 'The deficit, the currency, and jobs outside the commodity sector.' },
    ],
    hyperinflation: [
      { t: 'What is happening', b: 'Prices rise by the month, and people spend their wages the day they are paid.' },
      { t: 'The engine', b: 'The government cannot borrow, so the central bank prints money to pay its bills. That creates more inflation.', area: 'Monetary' },
      { t: 'What must happen together', b: 'Stop printing, close the deficit, and make people believe it. Partial measures fail.', area: 'Fiscal framework' },
      { t: 'An anchor for trust', b: 'A stable currency or an independent central bank helps people trust prices again.', area: 'Exchange rate' },
      { t: 'Keep an eye on', b: 'Inflation, how much money is being printed, and the deficit.' },
    ],
  };

  root.LMGuide = {
    lever: function (id, area) { return LEVERS[id] || AREA_FALLBACK; },
    hasLever: function (id) { return !!LEVERS[id]; },
    situation: function (key) { return SITUATIONS[key] || null; },
    areaNote: function (area) { return AREA_NOTES[area] || ''; }, stepNote: function (k) { return STEP_NOTES[k] || ''; }, methodNote: function (k) { return METHOD_NOTES[k] || ''; }, cards: function (key) { return CARDS[key] || null; },
    ALEVEL: ['inc_basic', 'inc_top', 'allowance', 'corp', 'inv_allow', 'vat', 'duties', 'property', 'health', 'education', 'defence', 'policing', 'pay', 'unemp_ben', 'pensions', 'child_ben', 'inf_roads', 'inf_rail', 'inf_digital', 'renew', 'hh_energy_sub', 'min_wage', 'emp_sub', 'hire_credit', 'hc_vocational', 'dereg', 'compete', 'housebuild', 'plan_lib', 'tariff', 'tariff_cut', 'fta', 'carbon', 'rate', 'cb_indep', 'qe', 'fx_int', 'devalue', 'guarantee', 'bailout', 'mortgage', 'fiscal_rule', 'def_target', 'emerg_budget', 'debt_issue', 'restructure', 'maturity', 'fx_borrow', 'temp_tax', 'hh_payments', 'furlough', 'loan_guar', 'price_cap', 'fdi_inc', 'mig_skilled', 'bank_cap', 'fin_reg', 'fixed_fx', 'mfg', 'inf_ports'],
    GLOSSARY: GLOSSARY,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LMGuide;
})(typeof window !== 'undefined' ? window : globalThis);
