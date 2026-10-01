/**
 * Syllabus structure for each curriculum: the units a curriculum page groups
 * its lessons under, and the section titles a topic code resolves to.
 *
 * Sources (section numbering and titles as published by the exam boards):
 *   - Cambridge IGCSE Physics 0625, syllabus for examination 2023–2025
 *   - Physics for Cambridge International AS & A Level Coursebook, 3rd edition
 *     (Sang, Jones, Chadha, Woodside, 2020) — chapter and section numbering
 *   - IB Diploma Programme Physics guide, first assessment 2025
 *
 * Only structure lives here (codes and titles). Which lesson covers which
 * section is data, in the `topics` table's topic code columns.
 */

export interface SyllabusSection {
  code: string;
  title: string;
}

export interface SyllabusUnit {
  code: string;
  title: string;
  /** e.g. "AS", "A Level", "SL & HL", "AHL" (IB additional higher level). */
  level?: string;
  sections: SyllabusSection[];
}

const s = (code: string, title: string): SyllabusSection => ({ code, title });

const CAMBRIDGE_MATHS: SyllabusUnit = {
  code: 'Maths',
  title: 'Mathematical requirements',
  sections: [s('Maths', 'Mathematical skills used throughout the syllabus')],
};

export const IGCSE_0625: SyllabusUnit[] = [
  CAMBRIDGE_MATHS,
  {
    code: '1',
    title: 'Motion, forces and energy',
    sections: [
      s('1.1', 'Physical quantities and measurement techniques'),
      s('1.2', 'Motion'),
      s('1.3', 'Mass and weight'),
      s('1.4', 'Density'),
      s('1.5.1', 'Effects of forces'),
      s('1.5.2', 'Turning effect of forces'),
      s('1.5.3', 'Centre of gravity'),
      s('1.6', 'Momentum'),
      s('1.7.1', 'Energy'),
      s('1.7.2', 'Work'),
      s('1.7.3', 'Energy resources'),
      s('1.7.4', 'Power'),
      s('1.8', 'Pressure'),
    ],
  },
  {
    code: '2',
    title: 'Thermal physics',
    sections: [
      s('2.1.1', 'States of matter'),
      s('2.1.2', 'Particle model'),
      s('2.1.3', 'Gases and the absolute scale of temperature'),
      s('2.2.1', 'Thermal expansion of solids, liquids and gases'),
      s('2.2.2', 'Specific heat capacity'),
      s('2.2.3', 'Melting, boiling and evaporation'),
      s('2.3.1', 'Conduction'),
      s('2.3.2', 'Convection'),
      s('2.3.3', 'Radiation'),
      s('2.3.4', 'Consequences of thermal energy transfer'),
    ],
  },
  {
    code: '3',
    title: 'Waves',
    sections: [
      s('3.1', 'General properties of waves'),
      s('3.2.1', 'Reflection of light'),
      s('3.2.2', 'Refraction of light'),
      s('3.2.3', 'Thin lenses'),
      s('3.2.4', 'Dispersion of light'),
      s('3.3', 'Electromagnetic spectrum'),
      s('3.4', 'Sound'),
    ],
  },
  {
    code: '4',
    title: 'Electricity and magnetism',
    sections: [
      s('4.1', 'Simple phenomena of magnetism'),
      s('4.2.1', 'Electric charge'),
      s('4.2.2', 'Electric current'),
      s('4.2.3', 'Electromotive force and potential difference'),
      s('4.2.4', 'Resistance'),
      s('4.2.5', 'Electrical energy and electrical power'),
      s('4.3.1', 'Circuit diagrams and circuit components'),
      s('4.3.2', 'Series and parallel circuits'),
      s('4.3.3', 'Action and use of circuit components'),
      s('4.4', 'Electrical safety'),
      s('4.5.1', 'Electromagnetic induction'),
      s('4.5.2', 'The a.c. generator'),
      s('4.5.3', 'Magnetic effect of a current'),
      s('4.5.4', 'Force on a current-carrying conductor'),
      s('4.5.5', 'The d.c. motor'),
      s('4.5.6', 'The transformer'),
    ],
  },
  {
    code: '5',
    title: 'Nuclear physics',
    sections: [
      s('5.1.1', 'The atom'),
      s('5.1.2', 'The nucleus'),
      s('5.2.1', 'Detection of radioactivity'),
      s('5.2.2', 'The three types of nuclear emission'),
      s('5.2.3', 'Radioactive decay'),
      s('5.2.4', 'Half-life'),
      s('5.2.5', 'Safety precautions'),
    ],
  },
  {
    code: '6',
    title: 'Space physics',
    sections: [
      s('6.1.1', 'The Earth'),
      s('6.1.2', 'The Solar System'),
      s('6.2.1', 'The Sun as a star'),
      s('6.2.2', 'Stars'),
      s('6.2.3', 'The Universe'),
    ],
  },
];

const AS_UNITS: SyllabusUnit[] = [
  {
    code: '1',
    title: 'Kinematics',
    level: 'AS',
    sections: [
      s('1.1', 'Speed'),
      s('1.2', 'Distance and displacement, scalar and vector'),
      s('1.3', 'Speed and velocity'),
      s('1.4', 'Displacement–time graphs'),
      s('1.5', 'Combining displacements'),
      s('1.6', 'Combining velocities'),
      s('1.7', 'Subtracting vectors'),
      s('1.8', 'Other examples of scalar and vector quantities'),
    ],
  },
  {
    code: '2',
    title: 'Accelerated motion',
    level: 'AS',
    sections: [
      s('2.1', 'The meaning of acceleration'),
      s('2.2', 'Calculating acceleration'),
      s('2.3', 'Units of acceleration'),
      s('2.4', 'Deducing acceleration'),
      s('2.5', 'Deducing displacement'),
      s('2.6', 'Measuring velocity and acceleration'),
      s('2.7', 'Determining velocity and acceleration in the laboratory'),
      s('2.8', 'The equations of motion'),
      s('2.9', 'Deriving the equations of motion'),
      s('2.10', 'Uniform and non-uniform acceleration'),
      s('2.11', 'Acceleration caused by gravity'),
      s('2.12', 'Determining g'),
      s('2.13', 'Motion in two dimensions: projectiles'),
      s('2.14', 'Understanding projectiles'),
    ],
  },
  {
    code: '3',
    title: 'Dynamics',
    level: 'AS',
    sections: [
      s('3.1', 'Force, mass and acceleration'),
      s('3.2', 'Identifying forces'),
      s('3.3', 'Weight, friction and gravity'),
      s('3.4', 'Mass and inertia'),
      s('3.5', 'Moving through fluids'),
      s('3.6', "Newton's third law of motion"),
      s('3.7', 'Understanding SI units'),
    ],
  },
  {
    code: '4',
    title: 'Forces',
    level: 'AS',
    sections: [
      s('4.1', 'Combining forces'),
      s('4.2', 'Components of vectors'),
      s('4.3', 'Centre of gravity'),
      s('4.4', 'The turning effect of a force'),
      s('4.5', 'The torque of a couple'),
    ],
  },
  {
    code: '5',
    title: 'Work, energy and power',
    level: 'AS',
    sections: [
      s('5.1', 'Doing work, transferring energy'),
      s('5.2', 'Gravitational potential energy'),
      s('5.3', 'Kinetic energy'),
      s('5.4', 'Gravitational potential to kinetic energy transformations'),
      s('5.5', 'Down, up, down: energy changes'),
      s('5.6', 'Energy transfers'),
      s('5.7', 'Power'),
    ],
  },
  {
    code: '6',
    title: 'Momentum',
    level: 'AS',
    sections: [
      s('6.1', 'The idea of momentum'),
      s('6.2', 'Modelling collisions'),
      s('6.3', 'Understanding collisions'),
      s('6.4', 'Explosions and crash-landings'),
      s('6.5', 'Collisions in two dimensions'),
      s('6.6', "Momentum and Newton's laws"),
      s('6.7', 'Understanding motion'),
    ],
  },
  {
    code: '7',
    title: 'Matter and materials',
    level: 'AS',
    sections: [
      s('7.1', 'Density'),
      s('7.2', 'Pressure'),
      s('7.3', "Archimedes' principle"),
      s('7.4', 'Compressive and tensile forces'),
      s('7.5', 'Stretching materials'),
      s('7.6', 'Elastic potential energy'),
    ],
  },
  {
    code: '8',
    title: 'Electric current',
    level: 'AS',
    sections: [
      s('8.1', 'Circuit symbols and diagrams'),
      s('8.2', 'Electric current'),
      s('8.3', 'An equation for current'),
      s('8.4', 'The meaning of voltage'),
      s('8.5', 'Electrical resistance'),
      s('8.6', 'Electrical power'),
    ],
  },
  {
    code: '9',
    title: "Kirchhoff's laws",
    level: 'AS',
    sections: [
      s('9.1', "Kirchhoff's first law"),
      s('9.2', "Kirchhoff's second law"),
      s('9.3', "Applying Kirchhoff's laws"),
      s('9.4', 'Resistor combinations'),
    ],
  },
  {
    code: '10',
    title: 'Resistance and resistivity',
    level: 'AS',
    sections: [
      s('10.1', 'The I–V characteristic for a metallic conductor'),
      s('10.2', "Ohm's law"),
      s('10.3', 'Resistance and temperature'),
      s('10.4', 'Resistivity'),
    ],
  },
  {
    code: '11',
    title: 'Practical circuits',
    level: 'AS',
    sections: [
      s('11.1', 'Internal resistance'),
      s('11.2', 'Potential dividers'),
      s('11.3', 'Sensors'),
      s('11.4', 'Potentiometer circuits'),
    ],
  },
  {
    code: '12',
    title: 'Waves',
    level: 'AS',
    sections: [
      s('12.1', 'Describing waves'),
      s('12.2', 'Longitudinal and transverse waves'),
      s('12.3', 'Wave energy'),
      s('12.4', 'Wave speed'),
      s('12.5', 'The Doppler effect for sound waves'),
      s('12.6', 'Electromagnetic waves'),
      s('12.7', 'Electromagnetic radiation'),
      s('12.8', 'Orders of magnitude'),
      s('12.9', 'The nature of electromagnetic waves'),
      s('12.10', 'Polarisation'),
    ],
  },
  {
    code: '13',
    title: 'Superposition of waves',
    level: 'AS',
    sections: [
      s('13.1', 'The principle of superposition of waves'),
      s('13.2', 'Diffraction of waves'),
      s('13.3', 'Interference'),
      s('13.4', 'The Young double-slit experiment'),
      s('13.5', 'Diffraction gratings'),
    ],
  },
  {
    code: '14',
    title: 'Stationary waves',
    level: 'AS',
    sections: [
      s('14.1', 'From moving to stationary'),
      s('14.2', 'Nodes and antinodes'),
      s('14.3', 'Formation of stationary waves'),
      s('14.4', 'Determining the wavelength and speed of sound'),
    ],
  },
  {
    code: '15',
    title: 'Atomic structure',
    level: 'AS',
    sections: [
      s('15.1', 'Looking inside the atom'),
      s('15.2', 'Alpha-particle scattering and the nucleus'),
      s('15.3', 'A simple model of the atom'),
      s('15.4', 'Nucleons and electrons'),
      s('15.5', 'Forces in the nucleus'),
      s('15.6', 'Discovering radioactivity'),
      s('15.7', 'Radiation from radioactive substances'),
      s('15.8', 'Energies in α and β decay'),
      s('15.9', 'Equations of radioactive decay'),
      s('15.10', 'Fundamental particles'),
      s('15.11', 'Families of particles'),
      s('15.12', 'Another look at β decay'),
      s('15.13', 'Another nuclear force'),
    ],
  },
  {
    code: 'P1',
    title: 'Practical skills at AS Level',
    level: 'AS',
    sections: [
      s('P1.1', 'Practical work in physics'),
      s('P1.2', 'Using apparatus and following instructions'),
      s('P1.3', 'Gathering evidence'),
      s('P1.4', 'Precision, accuracy, errors and uncertainties'),
      s('P1.5', 'Finding the value of an uncertainty'),
      s('P1.6', 'Percentage uncertainty'),
      s('P1.7', 'Recording results'),
      s('P1.8', 'Analysing results'),
      s('P1.9', 'Testing a relationship'),
      s('P1.10', 'Combining uncertainties'),
      s('P1.11', 'Identifying limitations in procedures and suggesting improvements'),
    ],
  },
];

const A2_UNITS: SyllabusUnit[] = [
  {
    code: '16',
    title: 'Circular motion',
    level: 'A Level',
    sections: [
      s('16.1', 'Describing circular motion'),
      s('16.2', 'Angles in radians'),
      s('16.3', 'Steady speed, changing velocity'),
      s('16.4', 'Angular speed'),
      s('16.5', 'Centripetal forces'),
      s('16.6', 'Calculating acceleration and force'),
      s('16.7', 'The origins of centripetal forces'),
    ],
  },
  {
    code: '17',
    title: 'Gravitational fields',
    level: 'A Level',
    sections: [
      s('17.1', 'Representing a gravitational field'),
      s('17.2', 'Gravitational field strength g'),
      s('17.3', 'Energy in a gravitational field'),
      s('17.4', 'Gravitational potential'),
      s('17.5', 'Orbiting under gravity'),
      s('17.6', 'The orbital period'),
      s('17.7', 'Orbiting the Earth'),
    ],
  },
  {
    code: '18',
    title: 'Oscillations',
    level: 'A Level',
    sections: [
      s('18.1', 'Free and forced oscillations'),
      s('18.2', 'Observing oscillations'),
      s('18.3', 'Describing oscillations'),
      s('18.4', 'Simple harmonic motion'),
      s('18.5', 'Representing s.h.m. graphically'),
      s('18.6', 'Frequency and angular frequency'),
      s('18.7', 'Equations of s.h.m.'),
      s('18.8', 'Energy changes in s.h.m.'),
      s('18.9', 'Damped oscillations'),
      s('18.10', 'Resonance'),
    ],
  },
  {
    code: '19',
    title: 'Thermal physics',
    level: 'A Level',
    sections: [
      s('19.1', 'Changes of state'),
      s('19.2', 'Energy changes'),
      s('19.3', 'Internal energy'),
      s('19.4', 'The meaning of temperature'),
      s('19.5', 'Thermometers'),
      s('19.6', 'Calculating energy changes'),
    ],
  },
  {
    code: '20',
    title: 'Ideal gases',
    level: 'A Level',
    sections: [
      s('20.1', 'Particles of a gas'),
      s('20.2', 'Explaining pressure'),
      s('20.3', 'Measuring gases'),
      s('20.4', "Boyle's law"),
      s('20.5', 'Changing temperature'),
      s('20.6', 'Ideal gas equation'),
      s('20.7', 'Modelling gases: the kinetic model'),
      s('20.8', 'Temperature and molecular kinetic energy'),
    ],
  },
  {
    code: '21',
    title: 'Uniform electric fields',
    level: 'A Level',
    sections: [
      s('21.1', 'Attraction and repulsion'),
      s('21.2', 'The concept of an electric field'),
      s('21.3', 'Electric field strength'),
      s('21.4', 'Force on a charge'),
    ],
  },
  {
    code: '22',
    title: "Coulomb's law",
    level: 'A Level',
    sections: [
      s('22.1', 'Electric fields'),
      s('22.2', "Coulomb's law"),
      s('22.3', 'Electric field strength for a radial field'),
      s('22.4', 'Electric potential'),
      s('22.5', 'Gravitational and electric fields'),
    ],
  },
  {
    code: '23',
    title: 'Capacitance',
    level: 'A Level',
    sections: [
      s('23.1', 'Capacitors in use'),
      s('23.2', 'Energy stored in a capacitor'),
      s('23.3', 'Capacitors in parallel'),
      s('23.4', 'Capacitors in series'),
      s('23.5', 'Comparing capacitors and resistors'),
      s('23.6', 'Capacitor networks'),
      s('23.7', 'Charge and discharge of capacitors'),
    ],
  },
  {
    code: '24',
    title: 'Magnetic fields and electromagnetism',
    level: 'A Level',
    sections: [
      s('24.1', 'Producing and representing magnetic fields'),
      s('24.2', 'Magnetic force'),
      s('24.3', 'Magnetic flux density'),
      s('24.4', 'Measuring magnetic flux density'),
      s('24.5', 'Currents crossing fields'),
      s('24.6', 'Forces between currents'),
      s('24.7', 'Relating SI units'),
      s('24.8', 'Comparing forces in magnetic, electric and gravitational fields'),
    ],
  },
  {
    code: '25',
    title: 'Motion of charged particles',
    level: 'A Level',
    sections: [
      s('25.1', 'Observing the force'),
      s('25.2', 'Orbiting charged particles'),
      s('25.3', 'Electric and magnetic fields'),
      s('25.4', 'The Hall effect'),
      s('25.5', 'Discovering the electron'),
    ],
  },
  {
    code: '26',
    title: 'Electromagnetic induction',
    level: 'A Level',
    sections: [
      s('26.1', 'Observing induction'),
      s('26.2', 'Explaining electromagnetic induction'),
      s('26.3', "Faraday's law of electromagnetic induction"),
      s('26.4', "Lenz's law"),
      s('26.5', 'Everyday examples of electromagnetic induction'),
    ],
  },
  {
    code: '27',
    title: 'Alternating currents',
    level: 'A Level',
    sections: [
      s('27.1', 'Sinusoidal current'),
      s('27.2', 'Alternating voltages'),
      s('27.3', 'Power and alternating current'),
      s('27.4', 'Rectification'),
    ],
  },
  {
    code: '28',
    title: 'Quantum physics',
    level: 'A Level',
    sections: [
      s('28.1', 'Modelling with particles and waves'),
      s('28.2', 'Particulate nature of light'),
      s('28.3', 'The photoelectric effect'),
      s('28.4', 'Threshold frequency and wavelength'),
      s('28.5', 'Photons have momentum too'),
      s('28.6', 'Line spectra'),
      s('28.7', 'Explaining the origin of line spectra'),
      s('28.8', 'Photon energies'),
      s('28.9', 'The nature of light: waves or particles?'),
      s('28.10', 'Electron waves'),
      s('28.11', 'Revisiting photons'),
    ],
  },
  {
    code: '29',
    title: 'Nuclear physics',
    level: 'A Level',
    sections: [
      s('29.1', 'Balanced equations'),
      s('29.2', 'Mass and energy'),
      s('29.3', 'Energy released in radioactive decay'),
      s('29.4', 'Binding energy and stability'),
      s('29.5', 'Randomness and radioactive decay'),
      s('29.6', 'The mathematics of radioactive decay'),
      s('29.7', 'Decay graphs and equations'),
      s('29.8', 'Decay constant λ and half-life'),
    ],
  },
  {
    code: '30',
    title: 'Medical imaging',
    level: 'A Level',
    sections: [
      s('30.1', 'The nature and production of X-rays'),
      s('30.2', 'X-ray attenuation'),
      s('30.3', 'Improving X-ray images'),
      s('30.4', 'Computerised axial tomography'),
      s('30.5', 'Using ultrasound in medicine'),
      s('30.6', 'Echo sounding'),
      s('30.7', 'Ultrasound scanning'),
      s('30.8', 'Positron Emission Tomography'),
    ],
  },
  {
    code: '31',
    title: 'Astronomy and cosmology',
    level: 'A Level',
    sections: [
      s('31.1', 'Standard candles'),
      s('31.2', 'Luminosity and radiant flux intensity'),
      s('31.3', 'Stellar radii'),
      s('31.4', 'The expanding Universe'),
    ],
  },
  {
    code: 'P2',
    title: 'Practical skills at A Level',
    level: 'A Level',
    sections: [
      s('P2.1', 'Planning and analysis'),
      s('P2.2', 'Planning'),
      s('P2.3', 'Analysis of the data'),
      s('P2.4', 'Treatment of uncertainties'),
      s('P2.5', 'Conclusions and evaluation of results'),
    ],
  },
];

export const AS_9702: SyllabusUnit[] = [CAMBRIDGE_MATHS, ...AS_UNITS];

/** A Level is the whole of AS plus the coursebook's chapters 16–31 and P2. */
export const A_LEVEL_9702: SyllabusUnit[] = [CAMBRIDGE_MATHS, ...AS_UNITS, ...A2_UNITS];

export const IB_PHYSICS: SyllabusUnit[] = [
  {
    code: 'Tools',
    title: 'Tools for physics',
    sections: [s('Tool 3', 'Tool 3: Mathematics')],
  },
  {
    code: 'A',
    title: 'Space, time and motion',
    sections: [
      s('A.1', 'Kinematics'),
      s('A.2', 'Forces and momentum'),
      s('A.3', 'Work, energy and power'),
      s('A.4', 'Rigid body mechanics (HL)'),
      s('A.5', 'Galilean and special relativity (HL)'),
    ],
  },
  {
    code: 'B',
    title: 'The particulate nature of matter',
    sections: [
      s('B.1', 'Thermal energy transfers'),
      s('B.2', 'Greenhouse effect'),
      s('B.3', 'Gas laws'),
      s('B.4', 'Thermodynamics (HL)'),
      s('B.5', 'Current and circuits'),
    ],
  },
  {
    code: 'C',
    title: 'Wave behaviour',
    sections: [
      s('C.1', 'Simple harmonic motion'),
      s('C.2', 'Wave model'),
      s('C.3', 'Wave phenomena'),
      s('C.4', 'Standing waves and resonance'),
      s('C.5', 'Doppler effect'),
    ],
  },
  {
    code: 'D',
    title: 'Fields',
    sections: [
      s('D.1', 'Gravitational fields'),
      s('D.2', 'Electric and magnetic fields'),
      s('D.3', 'Motion in electromagnetic fields'),
      s('D.4', 'Induction (HL)'),
    ],
  },
  {
    code: 'E',
    title: 'Nuclear and quantum physics',
    sections: [
      s('E.1', 'Structure of the atom'),
      s('E.2', 'Quantum physics (HL)'),
      s('E.3', 'Radioactive decay'),
      s('E.4', 'Fission'),
      s('E.5', 'Fusion and stars'),
    ],
  },
];

export const SYLLABI: Record<'igcse' | 'as' | 'a-level' | 'ib', SyllabusUnit[]> = {
  igcse: IGCSE_0625,
  as: AS_9702,
  'a-level': A_LEVEL_9702,
  ib: IB_PHYSICS,
};
