// Formations: each slot is a preset position on the pitch, in TEAM space.
//   d = depth, 0 at the team's own goal line, 1 at the opposition goal line
//   w = width, 0 at the team's left touchline, 1 at its right (facing the opposition goal)
// `group` decides which roles can be given to that slot (see roles.js).
// `number` is the default shirt number the slot is given.
(function () {
  const FM = (window.FM = window.FM || {});

  FM.FORMATIONS = {
    '4-3-3': {
      name: '4-3-3',
      slots: [
        { key: 'GK',  group: 'GK', d: 0.03, w: 0.50, number: 1,  defaultRole: 'goalkeeper' },
        { key: 'RB',  group: 'FB', d: 0.22, w: 0.90, number: 2,  defaultRole: 'full_back' },
        { key: 'RCB', group: 'CB', d: 0.20, w: 0.63, number: 4,  defaultRole: 'centre_half' },
        { key: 'LCB', group: 'CB', d: 0.20, w: 0.37, number: 5,  defaultRole: 'centre_half' },
        { key: 'LB',  group: 'FB', d: 0.22, w: 0.10, number: 3,  defaultRole: 'full_back' },
        { key: 'DM',  group: 'DM', d: 0.38, w: 0.50, number: 6,  defaultRole: 'defensive_midfielder' },
        { key: 'RCM', group: 'CM', d: 0.50, w: 0.70, number: 8,  defaultRole: 'central_midfielder' },
        { key: 'LCM', group: 'CM', d: 0.50, w: 0.30, number: 10, defaultRole: 'central_midfielder' },
        { key: 'RW',  group: 'WF', d: 0.78, w: 0.88, number: 7,  defaultRole: 'winger' },
        { key: 'ST',  group: 'ST', d: 0.80, w: 0.50, number: 9,  defaultRole: 'striker' },
        { key: 'LW',  group: 'WF', d: 0.78, w: 0.12, number: 11, defaultRole: 'winger' },
      ],
    },
    '4-2-2-2': {
      name: '4-2-2-2',
      slots: [
        { key: 'GK',   group: 'GK', d: 0.03, w: 0.50, number: 1,  defaultRole: 'goalkeeper' },
        { key: 'RB',   group: 'FB', d: 0.22, w: 0.90, number: 2,  defaultRole: 'full_back' },
        { key: 'RCB',  group: 'CB', d: 0.20, w: 0.63, number: 4,  defaultRole: 'centre_half' },
        { key: 'LCB',  group: 'CB', d: 0.20, w: 0.37, number: 5,  defaultRole: 'centre_half' },
        { key: 'LB',   group: 'FB', d: 0.22, w: 0.10, number: 3,  defaultRole: 'full_back' },
        { key: 'RDM',  group: 'DM', d: 0.40, w: 0.64, number: 6,  defaultRole: 'defensive_midfielder' },
        { key: 'LDM',  group: 'DM', d: 0.40, w: 0.36, number: 8,  defaultRole: 'defensive_midfielder' },
        { key: 'RAM',  group: 'AM', d: 0.62, w: 0.80, number: 7,  defaultRole: 'wide_midfielder' },
        { key: 'LAM',  group: 'AM', d: 0.62, w: 0.20, number: 10, defaultRole: 'wide_midfielder' },
        { key: 'RST',  group: 'ST', d: 0.78, w: 0.60, number: 9,  defaultRole: 'striker' },
        { key: 'LST',  group: 'ST', d: 0.78, w: 0.40, number: 11, defaultRole: 'striker' },
      ],
    },
  };
})();
