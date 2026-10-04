// Generated player names. Each player gets a nationality, and his name comes from that nation's pool of
// first names and surnames, so a squad is a mix of backgrounds rather than all one country.
// Combinations are checked against a list of real footballers' names and rejected if they match one.
(function () {
  const FM = (window.FM = window.FM || {});

  // [nation, weight in a typical squad, first names, surnames]
  const NATIONS = [
    ['England', 26, ['Oliver', 'Jack', 'Harry', 'Callum', 'Reece', 'Marcus', 'Declan', 'Tyler', 'Connor', 'Ellis', 'Jordan', 'Kieran'], ['Whitaker', 'Hargreaves', 'Pennington', 'Ashworth', 'Thorne', 'Gallagher', 'Lockwood', 'Bamford', 'Hartley', 'Prescott', 'Dunmore', 'Carrow']],
    ['Spain', 7, ['Alejandro', 'Diego', 'Javier', 'Pablo', 'Sergio', 'Adrián', 'Iker', 'Marcos', 'Rubén', 'Álvaro'], ['Navarro', 'Ibáñez', 'Cordero', 'Salinas', 'Villalobos', 'Quintero', 'Maldonado', 'Ferrer', 'Barrios', 'Escobar']],
    ['France', 7, ['Mathieu', 'Hugo', 'Théo', 'Antoine', 'Lucas', 'Baptiste', 'Quentin', 'Rémi', 'Florian', 'Yanis'], ['Lefèvre', 'Marchand', 'Dubois', 'Girard', 'Fontaine', 'Rousseau', 'Chevalier', 'Perrin', 'Moreau', 'Bonnet']],
    ['Germany', 6, ['Lukas', 'Jonas', 'Felix', 'Moritz', 'Niklas', 'Tobias', 'Florian', 'Jannik', 'Leon', 'Matthias'], ['Brandt', 'Köhler', 'Seidel', 'Hofmann', 'Wendt', 'Lindner', 'Vogel', 'Reinhardt', 'Kessler', 'Albrecht']],
    ['Brazil', 7, ['Thiago', 'Matheus', 'Gabriel', 'Rafael', 'Caio', 'Vinícius', 'Bruno', 'Leandro', 'Danilo', 'Wellington'], ['Almeida', 'Carvalho', 'Teixeira', 'Barbosa', 'Nascimento', 'Moura', 'Figueiredo', 'Rezende', 'Siqueira', 'Pacheco']],
    ['Nigeria', 5, ['Chukwuemeka', 'Tunde', 'Emeka', 'Segun', 'Kelechi', 'Ayodele', 'Obinna', 'Femi', 'Ikenna', 'Damilola'], ['Okafor', 'Adeyemi', 'Balogun', 'Nwosu', 'Olawale', 'Eze', 'Adebayo', 'Okonkwo', 'Oyelaran', 'Chukwu']],
    ['Ghana', 4, ['Kwame', 'Kofi', 'Yaw', 'Nana', 'Kwesi', 'Mensah', 'Ebo', 'Fiifi'], ['Boateng', 'Asante', 'Owusu', 'Amoah', 'Appiah', 'Darko', 'Quaye', 'Sarpong']],
    ['Netherlands', 4, ['Daan', 'Sven', 'Bram', 'Joost', 'Ruben', 'Thijs', 'Koen', 'Stijn'], ['van Dijkstra', 'de Boer', 'Visser', 'Hoekstra', 'Verhoeven', 'Bakker', 'Smeets', 'van der Linden']],
    ['Portugal', 4, ['Tiago', 'Rúben', 'Nuno', 'Diogo', 'Hélder', 'Rui', 'Gonçalo', 'Duarte'], ['Cardoso', 'Amaral', 'Medeiros', 'Pinheiro', 'Sequeira', 'Leitão', 'Viana', 'Coutinho']],
    ['Italy', 5, ['Matteo', 'Luca', 'Federico', 'Davide', 'Emanuele', 'Nicolò', 'Giacomo', 'Stefano'], ['Ferrante', 'Bellucci', 'Moretti', 'Caruso', 'Palumbo', 'Righetti', 'Vitale', 'Lombardi']],
    ['Argentina', 4, ['Facundo', 'Lautaro', 'Nahuel', 'Matías', 'Santiago', 'Franco', 'Emiliano', 'Ezequiel'], ['Ledesma', 'Acosta', 'Peralta', 'Sosa', 'Benítez', 'Ojeda', 'Correa', 'Villarreal']],
    ['Japan', 3, ['Haruto', 'Ren', 'Kaito', 'Sota', 'Yuto', 'Daiki', 'Takumi', 'Shun'], ['Tanabe', 'Hayakawa', 'Kobayashi', 'Matsuda', 'Okabe', 'Sugimoto', 'Fujimoto', 'Iwasaki']],
    ['South Korea', 3, ['Min-jun', 'Seo-jun', 'Ji-ho', 'Hyun-woo', 'Dong-hyun', 'Tae-yang', 'Jun-seo', 'Sung-min'], ['Kang', 'Yoon', 'Shin', 'Baek', 'Jeon', 'Hwang', 'Moon', 'Song']],
    ['Poland', 3, ['Mateusz', 'Kamil', 'Bartosz', 'Piotr', 'Szymon', 'Jakub', 'Marcin', 'Dawid'], ['Kowalczyk', 'Wójcik', 'Zieliński', 'Szymański', 'Mazur', 'Krawczyk', 'Pawlak', 'Dudek']],
    ['Croatia', 3, ['Luka', 'Ivan', 'Marko', 'Josip', 'Mario', 'Dario', 'Tomislav', 'Filip'], ['Horvat', 'Perić', 'Babić', 'Matić', 'Vuković', 'Jurić', 'Knežević', 'Radić']],
    ['Morocco', 3, ['Youssef', 'Amine', 'Hamza', 'Ilyas', 'Soufiane', 'Reda', 'Zakaria', 'Anas'], ['El Amrani', 'Bennani', 'Tazi', 'Alaoui', 'Berrada', 'Ziani', 'Idrissi', 'Chraibi']],
    ['Senegal', 3, ['Mamadou', 'Cheikh', 'Ibrahima', 'Moussa', 'Pape', 'Abdoulaye', 'Idrissa', 'Lamine'], ['Diallo', 'Ndiaye', 'Faye', 'Sarr', 'Mbaye', 'Thiam', 'Gueye', 'Sow']],
    ['Sweden', 2, ['Erik', 'Oskar', 'Viktor', 'Anton', 'Emil', 'Axel', 'Linus', 'Joel'], ['Lindqvist', 'Bergström', 'Holmgren', 'Sandberg', 'Nyström', 'Falk', 'Ekberg', 'Wallin']],
    ['Ireland', 3, ['Cian', 'Darragh', 'Eoin', 'Conor', 'Ronan', 'Seán', 'Fionn', 'Cathal'], ['Gallagher', 'Brennan', 'Keane', 'Doyle', 'Fitzpatrick', 'Lynch', 'Costigan', 'Maguire']],
    ['USA', 3, ['Tyler', 'Brandon', 'Austin', 'Cole', 'Jaylen', 'Mason', 'Drew', 'Trey'], ['Whitfield', 'Brooks', 'Delgado', 'Hargrove', 'Maddox', 'Calloway', 'Reyes', 'Sutter']],
  ];
  FM.NATIONS = NATIONS.map((n) => n[0]);

  // Real players whose exact full names must never be generated (lower case, first name then surname).
  const REAL = new Set([
    'lionel messi', 'cristiano ronaldo', 'kylian mbappé', 'kylian mbappe', 'erling haaland', 'harry kane', 'mohamed salah', 'kevin de bruyne', 'virgil van dijk',
    'luka modrić', 'luka modric', 'robert lewandowski', 'neymar jr', 'vinícius júnior', 'jude bellingham', 'bukayo saka', 'phil foden', 'marcus rashford',
    'jack grealish', 'declan rice', 'trent alexander-arnold', 'raheem sterling', 'jordan henderson', 'jordan pickford', 'kyle walker', 'john stones',
    'harry maguire', 'luke shaw', 'mason mount', 'ben white', 'ivan toney', 'ollie watkins', 'jamie vardy', 'wayne rooney', 'steven gerrard', 'frank lampard',
    'david beckham', 'paul scholes', 'ryan giggs', 'thierry henry', 'zinedine zidane', 'andres iniesta', 'andrés iniesta', 'xavi hernández', 'sergio ramos',
    'gerard piqué', 'sergio busquets', 'pedri gonzález', 'gavi páez', 'antoine griezmann', 'olivier giroud', 'karim benzema', 'paul pogba', 'n\'golo kanté',
    'hugo lloris', 'manuel neuer', 'thomas müller', 'toni kroos', 'joshua kimmich', 'leroy sané', 'jamal musiala', 'kai havertz', 'ilkay gündogan',
    'ederson moraes', 'alisson becker', 'casemiro', 'richarlison', 'rodrygo goes', 'gabriel jesus', 'gabriel martinelli', 'bruno fernandes', 'bernardo silva',
    'rúben dias', 'ruben dias', 'rafael leão', 'diogo jota', 'joão félix', 'victor osimhen', 'wilfried zaha', 'sadio mané', 'sadio mane', 'achraf hakimi',
    'hakim ziyech', 'son heung-min', 'takefusa kubo', 'kaoru mitoma', 'christian pulisic', 'weston mckennie', 'declan rice', 'robbie keane', 'roy keane',
    'dimitri payet', 'diego maradona', 'gabriel batistuta', 'paulo dybala', 'julián álvarez', 'enzo fernández', 'alexis mac allister', 'emiliano martínez',
    'sergio agüero', 'carlos tevez', 'angel di maría', 'ángel di maría', 'edinson cavani', 'luis suárez', 'darwin núñez', 'federico valverde', 'thibaut courtois',
    'eden hazard', 'romelu lukaku', 'jan oblak', 'david de gea', 'david silva', 'fernando torres', 'iker casillas', 'carles puyol', 'pep guardiola',
    'jürgen klopp', 'zlatan ibrahimovic', 'marco reus', 'mats hummels', 'timo werner', 'serge gnabry', 'robin gosens', 'matthijs de ligt', 'frenkie de jong',
    'memphis depay', 'cody gakpo', 'arjen robben', 'robin van persie', 'wesley sneijder', 'dennis bergkamp', 'patrick kluivert', 'jaap stam', 'edwin van der sar',
  ]);

  FM.isRealName = function (full) { return REAL.has(full.toLowerCase()); };

  function pickNation(rng, bias) {
    // bias: optional map nation -> extra weight, so a team can lean toward certain countries
    let total = 0;
    const w = NATIONS.map((n) => { const v = n[1] + ((bias && bias[n[0]]) || 0); total += v; return v; });
    let r = rng() * total;
    for (let i = 0; i < NATIONS.length; i++) { r -= w[i]; if (r <= 0) return NATIONS[i]; }
    return NATIONS[0];
  }

  // Returns { name, nation }, never repeating a name already in `used` or matching a real player.
  FM.generateIdentity = function (rng, used, bias) {
    for (let tries = 0; tries < 60; tries++) {
      const n = pickNation(rng, bias);
      const first = n[2][Math.floor(rng() * n[2].length)], last = n[3][Math.floor(rng() * n[3].length)];
      const name = first + ' ' + last;
      if (used.has(name) || FM.isRealName(name)) continue;
      used.add(name);
      return { name, nation: n[0] };
    }
    return { name: 'Player ' + (used.size + 1), nation: 'England' };
  };
})();
