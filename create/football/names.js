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

  // More names for every nation, so a league of two hundred players does not keep meeting the same few surnames (and never repeats a surname while a fresh one is left).
  const EXTRA = {
    England: [['Ethan', 'Luke', 'Owen', 'Ryan', 'Joel', 'Dean', 'Kyle', 'Liam', 'Ross', 'Adam', 'Nathan', 'Craig'], ['Aldridge', 'Blackwood', 'Cartwright', 'Danbury', 'Fenwick', 'Garrity', 'Holloway', 'Ingram', 'Jessop', 'Kendrick', 'Langley', 'Marlow', 'Nesbitt', 'Oakley', 'Pemberton', 'Radcliffe', 'Sherwood', 'Tennant', 'Underwood', 'Waverley', 'Yardley', 'Ellerby', 'Hollis', 'Stanway', 'Brigham', 'Cotterill', 'Draycott', 'Everard', 'Farrow', 'Gresham']],
    Spain: [['Raúl', 'Óscar', 'Hugo', 'Mateo', 'Néstor', 'Gonzalo', 'Ismael', 'Joaquín'], ['Aguirre', 'Bermúdez', 'Calderón', 'Duarte', 'Echeverría', 'Fuentes', 'Garrido', 'Heredia', 'Iglesias', 'Jurado', 'Lorenzo', 'Márquez', 'Nieto', 'Olmedo', 'Paredes', 'Quesada', 'Robles', 'Sandoval', 'Tejada', 'Uribe', 'Valdés', 'Zamora', 'Cisneros', 'Montoya', 'Arroyo', 'Beltrán']],
    France: [['Maxime', 'Julien', 'Clément', 'Romain', 'Kévin', 'Alexis', 'Corentin', 'Sofiane'], ['Aubert', 'Bellamy', 'Carpentier', 'Delmas', 'Estève', 'Fabre', 'Gaillard', 'Huet', 'Jourdan', 'Labbé', 'Maillard', 'Noël', 'Pasquier', 'Quéré', 'Renaud', 'Sauvage', 'Tessier', 'Vasseur', 'Barbier', 'Colin', 'Dufour', 'Lacroix', 'Mercier', 'Navarre']],
    Germany: [['Fabian', 'Julian', 'Philipp', 'Sebastian', 'Marvin', 'Dominik', 'Lennard', 'Henrik'], ['Ackermann', 'Baumann', 'Conrad', 'Dietrich', 'Engel', 'Fischer', 'Gruber', 'Heinrich', 'Jansen', 'Keller', 'Lang', 'Maurer', 'Neumann', 'Ostermann', 'Pohl', 'Richter', 'Schreiber', 'Thalmann', 'Ulrich', 'Voss', 'Weber', 'Zimmer', 'Böhm', 'Falkner', 'Hartmann', 'Roth']],
    Brazil: [['Felipe', 'Igor', 'Renan', 'Murilo', 'Adriano', 'Ricardo', 'Rodrigo', 'Henrique'], ['Albuquerque', 'Bezerra', 'Cavalcanti', 'Damasceno', 'Esteves', 'Fagundes', 'Guimarães', 'Holanda', 'Junqueira', 'Lacerda', 'Medeiros', 'Nogueira', 'Oliveira', 'Prado', 'Queiroz', 'Ribeiro', 'Sampaio', 'Tavares', 'Vasconcelos', 'Xavier', 'Azevedo', 'Brandão', 'Camargo', 'Dantas', 'Fonseca', 'Magalhães']],
    Nigeria: [['Chidi', 'Uche', 'Bayo', 'Sola', 'Ugo', 'Ifeanyi', 'Yemi', 'Tobi'], ['Abiola', 'Bello', 'Chinedu', 'Eboh', 'Fashola', 'Gbadamosi', 'Haruna', 'Ibekwe', 'Jegede', 'Kalu', 'Lawal', 'Mustapha', 'Nnamdi', 'Obi', 'Popoola', 'Salami', 'Taiwo', 'Udoh', 'Yakubu', 'Akande', 'Babatunde', 'Egbuna', 'Ogunleye', 'Okoro', 'Onyeama']],
    Ghana: [['Kojo', 'Kwabena', 'Papa', 'Isaac', 'Ato', 'Joojo', 'Kobby', 'Samuel'], ['Acheampong', 'Badu', 'Danso', 'Gyamfi', 'Hammond', 'Lamptey', 'Nti', 'Odoom', 'Peprah', 'Quartey', 'Tetteh', 'Yeboah', 'Addo', 'Agyeman', 'Bonsu', 'Donkor', 'Frimpong', 'Kyei', 'Osei', 'Wiredu', 'Antwi', 'Ofori']],
    Netherlands: [['Niels', 'Floris', 'Bas', 'Jelle', 'Mees', 'Wouter', 'Gijs', 'Teun'], ['Aalbers', 'Brouwer', 'Claassen', 'Dekker', 'Evers', 'Franken', 'Gerritsen', 'Hendriks', 'Jacobs', 'Kuipers', 'Lammers', 'Mulder', 'Oosterhuis', 'Pieters', 'Roelofs', 'Scholten', 'Timmermans', 'Vermeulen', 'Wouters', 'Zwart', 'Bosman', 'de Wit', 'van Rijn', 'Kok', 'Veldkamp']],
    Portugal: [['André', 'Ricardo', 'Fábio', 'Hugo', 'Miguel', 'Paulo', 'Sérgio', 'Vasco'], ['Fontes', 'Gaspar', 'Henriques', 'Jardim', 'Macedo', 'Neves', 'Ornelas', 'Peixoto', 'Queirós', 'Salgado', 'Teles', 'Valente', 'Varela', 'Abreu', 'Brites', 'Cabral', 'Loureiro', 'Matos', 'Nunes', 'Pestana']],
    Italy: [['Alessio', 'Andrea', 'Claudio', 'Gianluca', 'Lorenzo', 'Mattia', 'Riccardo', 'Tommaso'], ['Amato', 'Barone', 'Cattaneo', 'D\'Angelo', 'Esposito', 'Fabbri', 'Galli', 'Iacono', 'Leone', 'Marini', 'Neri', 'Orlandi', 'Pellegrini', 'Rinaldi', 'Sartori', 'Testa', 'Zanetti', 'Conti', 'De Luca', 'Farina', 'Gentile', 'Basile', 'Colombo', 'Rizzo']],
    Argentina: [['Tomás', 'Agustín', 'Bautista', 'Maximiliano', 'Cristian', 'Leandro', 'Rodrigo', 'Ramiro'], ['Aguilar', 'Bustos', 'Cabrera', 'Giménez', 'Herrera', 'Ibarra', 'Juárez', 'Luna', 'Medina', 'Núñez', 'Ortiz', 'Paz', 'Quiroga', 'Rivero', 'Toledo', 'Vera', 'Zárate', 'Bravo', 'Cáceres', 'Domínguez', 'Funes', 'Godoy', 'Rojas']],
    Japan: [['Akira', 'Haru', 'Ryo', 'Kenta', 'Naoki', 'Riku', 'Hiroto', 'Tomoya'], ['Aoki', 'Baba', 'Chiba', 'Daimon', 'Endo', 'Fukuda', 'Goto', 'Hamada', 'Ishikawa', 'Jinno', 'Kato', 'Mori', 'Nakano', 'Ogawa', 'Saito', 'Takeda', 'Ueda', 'Yamada', 'Abe', 'Hirano', 'Ito', 'Kimura', 'Noguchi', 'Shimizu']],
    'South Korea': [['Jae-won', 'Seung-ho', 'Woo-jin', 'Hyeon-seo', 'Do-yoon', 'Joon-ho', 'Si-woo', 'Gun-woo'], ['Ahn', 'Bae', 'Cho', 'Gu', 'Han', 'Im', 'Jang', 'Kwon', 'Lim', 'Min', 'Nam', 'Oh', 'Ryu', 'Seo', 'Woo', 'Yang', 'Choi', 'Gil', 'Heo', 'Jung']],
    Poland: [['Adrian', 'Grzegorz', 'Łukasz', 'Paweł', 'Rafał', 'Sebastian', 'Tomasz', 'Wojciech'], ['Adamczyk', 'Baran', 'Czarnecki', 'Dąbrowski', 'Górski', 'Jabłoński', 'Kaczmarek', 'Lewicki', 'Malinowski', 'Nowak', 'Olszewski', 'Rutkowski', 'Sikora', 'Tomaszewski', 'Urban', 'Walczak', 'Zając', 'Borkowski', 'Cieślak', 'Duda', 'Ostrowski', 'Michalak']],
    Croatia: [['Antonio', 'Nikola', 'Petar', 'Ante', 'Stipe', 'Vedran', 'Zoran', 'Domagoj'], ['Anić', 'Bilić', 'Čorić', 'Delić', 'Erceg', 'Franjić', 'Grgić', 'Ivanković', 'Jakovljević', 'Lovrić', 'Marić', 'Novak', 'Pavlović', 'Rukavina', 'Šimić', 'Tomić', 'Vidović', 'Zrinski', 'Blažević', 'Bošnjak', 'Dragić', 'Lukić']],
    Morocco: [['Karim', 'Mehdi', 'Othmane', 'Walid', 'Yassine', 'Bilal', 'Nabil', 'Samir'], ['Abdi', 'Benali', 'Chaoui', 'Daoudi', 'El Fassi', 'Ghazi', 'Haddad', 'Jabri', 'Kabbaj', 'Lahlou', 'Mansouri', 'Naciri', 'Ouazzani', 'Raji', 'Saidi', 'Tahiri', 'Yacoubi', 'Zaidi', 'Belhaj', 'Cherkaoui', 'El Idrissi', 'Lamrani']],
    Senegal: [['Alioune', 'Babacar', 'Demba', 'Ismaïla', 'Malick', 'Omar', 'Saliou', 'Boubacar'], ['Badji', 'Camara', 'Dione', 'Fall', 'Gomis', 'Kane', 'Ly', 'Mendy', 'Niang', 'Sène', 'Sy', 'Touré', 'Wade', 'Bâ', 'Cissé', 'Diop', 'Gaye', 'Kébé', 'Ndoye', 'Seck', 'Sambou', 'Tine']],
    Sweden: [['Albin', 'Gustav', 'Hampus', 'Jesper', 'Ludvig', 'Mattias', 'Simon', 'Tim'], ['Andersson', 'Blomqvist', 'Carlsson', 'Dahlgren', 'Eklund', 'Forsberg', 'Gustafsson', 'Hedlund', 'Isaksson', 'Jonsson', 'Karlberg', 'Lund', 'Magnusson', 'Norberg', 'Öberg', 'Persson', 'Rydberg', 'Strand', 'Törnqvist', 'Wikström', 'Axelsson', 'Berglund', 'Engström', 'Hellström']],
    Ireland: [['Aidan', 'Colm', 'Donal', 'Kevin', 'Niall', 'Oisín', 'Padraig', 'Tadhg'], ['Bolger', 'Cassidy', 'Dunne', 'Egan', 'Flanagan', 'Geraghty', 'Hegarty', 'Kavanagh', 'Lawlor', 'McCabe', 'Nolan', 'O\'Dwyer', 'Quigley', 'Regan', 'Slattery', 'Tierney', 'Walsh', 'Daly', 'Hennessy', 'Mulvey', 'Phelan', 'Shortall', 'Cullen']],
    USA: [['Colton', 'Dylan', 'Garrett', 'Hunter', 'Logan', 'Miles', 'Wyatt', 'Zane'], ['Ashby', 'Beckett', 'Carver', 'Dalton', 'Ellison', 'Fitch', 'Garrett', 'Holt', 'Ingersoll', 'Jarvis', 'Lawson', 'Merritt', 'Norwood', 'Osborne', 'Pruitt', 'Quinn', 'Rhodes', 'Sloan', 'Tillman', 'Vance', 'Yates', 'Bishop', 'Crowley', 'Dawson']],
  };
  NATIONS.forEach((n) => { const e = EXTRA[n[0]]; if (e) { n[2] = n[2].concat(e[0].filter((x) => n[2].indexOf(x) < 0)); n[3] = n[3].concat(e[1].filter((x) => n[3].indexOf(x) < 0)); } });
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
    // a surname is not used twice in the same league while there is a fresh one to be had (the first 60 tries insist; the last 40 only avoid a repeated full name)
    if (!used.surnames) { used.surnames = new Set(); used.forEach((full) => used.surnames.add(String(full).split(' ').slice(1).join(' '))); }
    for (let tries = 0; tries < 100; tries++) {
      const n = pickNation(rng, bias);
      const first = n[2][Math.floor(rng() * n[2].length)], last = n[3][Math.floor(rng() * n[3].length)];
      const name = first + ' ' + last;
      if (used.has(name) || FM.isRealName(name)) continue;
      if (tries < 60 && used.surnames.has(last)) continue;
      used.add(name); used.surnames.add(last);
      return { name, nation: n[0] };
    }
    return { name: 'Player ' + (used.size + 1), nation: 'England' };
  };
})();
