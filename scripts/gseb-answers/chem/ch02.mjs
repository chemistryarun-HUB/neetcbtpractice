// Ch 2 Electrochemistry. Model answers in NCERT wording (lech102, Rationalised 2023-24).
// Key: <year><M main | S supplementary>-<Part B question number>.
import { AFTER as CHEM_2024_MAIN } from '../chem-2024-wrap.mjs'
const r = String.raw

const MG_CU = r`Cell reaction: $\ce{Mg(s) + Cu^{2+}(aq) -> Mg^{2+}(aq) + Cu(s)}$, $n = 2$
$E^\circ_{cell} = E^\circ_{\ce{Cu^{2+}/Cu}} - E^\circ_{\ce{Mg^{2+}/Mg}}$
$E^\circ_{cell} = 0.34 - (-2.36) = 2.70$ V

Nernst equation:
$E_{cell} = E^\circ_{cell} - \dfrac{0.059}{n}\log\dfrac{[\ce{Mg^{2+}}]}{[\ce{Cu^{2+}}]}$
$E_{cell} = 2.70 - \dfrac{0.059}{2}\log\dfrac{0.001}{0.0001}$
$E_{cell} = 2.70 - 0.0295 \log 10$
$E_{cell} = 2.70 - 0.0295 = 2.6705$ V

The potential of the cell is 2.67 V.`

const SILVER = metal => {
  const [name, sym, mass, grams] = metal === 'Zn' ? ['zinc', 'Zn', '65.3', '0.438'] : ['nickel', 'Ni', '58.7', '0.394']
  return r`Moles of Ag deposited $= \dfrac{1.45}{108} = 0.01343$ mol
$\ce{Ag^+ + e^- -> Ag}$: 1 mol Ag needs 1 F
Quantity of electricity:
$Q = 0.01343 \times 96487 = 1295.4$ C

Time: $t = \dfrac{Q}{I} = \dfrac{1295.4}{1.5} = 863.6$ s $= 14.4$ min

The cells are in series, so the same 0.01343 mol of electrons passes through each.
Copper: $\ce{Cu^{2+} + 2e^- -> Cu}$
Mass of Cu $= \dfrac{0.01343}{2} \times 63.5 = 0.426$ g
${name[0].toUpperCase() + name.slice(1)}: $\ce{${sym}^{2+} + 2e^- -> ${sym}}$
Mass of ${sym} $= \dfrac{0.01343}{2} \times ${mass} = ${grams}$ g

The current flowed for 863.6 s (about 14.4 min); 0.426 g Cu and ${grams} g ${sym} were deposited.`
}

const VARIATION = r`Conductivity always decreases with decrease in concentration, both for weak and strong electrolytes. This is because the number of ions per unit volume that carry the current decreases on dilution. (Conductivity at any concentration is the conductance of one unit volume of solution.)

Molar conductivity increases with decrease in concentration. $\Lambda_m = \kappa V$, where $V$ is the volume containing one mole of electrolyte. On dilution, the decrease in $\kappa$ is more than compensated by the increase in $V$. When concentration approaches zero, molar conductivity is called limiting molar conductivity, $\Lambda^\circ_m$.

Strong electrolytes: $\Lambda_m$ increases slowly with dilution:
$\Lambda_m = \Lambda^\circ_m - A\,c^{1/2}$
A plot of $\Lambda_m$ against $c^{1/2}$ is a straight line with intercept $\Lambda^\circ_m$ and slope $-A$. $A$ depends on the type of electrolyte (1-1, 2-1, 2-2).

Weak electrolytes (e.g. acetic acid): degree of dissociation increases on dilution, so $\Lambda_m$ increases steeply, especially at low concentrations. $\Lambda^\circ_m$ cannot be found by extrapolation; it is obtained from Kohlrausch law.`

const H_FUEL_REACTIONS = r`Cathode: $\ce{O2(g) + 2H2O(l) + 4e^- -> 4OH^-(aq)}$
Anode: $\ce{2H2(g) + 4OH^-(aq) -> 4H2O(l) + 4e^-}$
Overall: $\ce{2H2(g) + O2(g) -> 2H2O(l)}$`

const ELECTROLYSIS = {
  i: r`(i) Aqueous $\ce{AgNO3}$ with silver electrodes:
Cathode: $\ce{Ag^+(aq) + e^- -> Ag(s)}$ (silver is deposited)
Anode: $\ce{Ag(s) -> Ag^+(aq) + e^-}$ (silver anode dissolves)`,
  ii: r`(ii) Aqueous $\ce{AgNO3}$ with platinum electrodes:
Cathode: $\ce{Ag^+(aq) + e^- -> Ag(s)}$ (silver is deposited)
Anode: $\ce{2H2O(l) -> O2(g) + 4H^+(aq) + 4e^-}$ ($\ce{O2}$ is evolved)`,
  iii: r`Dilute $\ce{H2SO4}$ with platinum electrodes:
Cathode: $\ce{H^+(aq) + e^- -> 1/2H2(g)}$ ($\ce{H2}$ is evolved)
Anode: $\ce{2H2O(l) -> O2(g) + 4H^+(aq) + 4e^-}$ ($\ce{O2}$ is evolved; in dilute $\ce{H2SO4}$ water is oxidised in preference to $\ce{SO4^{2-}}$)`,
  iv: r`(iv) Aqueous $\ce{CuCl2}$ with platinum electrodes:
Cathode: $\ce{Cu^{2+}(aq) + 2e^- -> Cu(s)}$ (copper is deposited)
Anode: $\ce{Cl^-(aq) -> 1/2Cl2(g) + e^-}$ ($\ce{Cl2}$ is evolved)`,
}

const KOHLRAUSCH_HAC = r`By Kohlrausch law:
$\Lambda^\circ_m(\ce{HAc}) = \lambda^\circ_{\ce{H^+}} + \lambda^\circ_{\ce{Ac^-}}$
$= \lambda^\circ_{\ce{H^+}} + \lambda^\circ_{\ce{Cl^-}} + \lambda^\circ_{\ce{Ac^-}} + \lambda^\circ_{\ce{Na^+}} - \lambda^\circ_{\ce{Cl^-}} - \lambda^\circ_{\ce{Na^+}}$
$= \Lambda^\circ_m(\ce{HCl}) + \Lambda^\circ_m(\ce{NaAc}) - \Lambda^\circ_m(\ce{NaCl})$
$= 425.9 + 91.0 - 126.4$
$\Lambda^\circ_m(\ce{HAc}) = 390.5$ S cm² mol⁻¹`

export const ANSWERS = {
  '2025M-1': r`Faraday's laws of electrolysis:
(i) First law: the amount of chemical reaction which occurs at any electrode during electrolysis by a current is proportional to the quantity of electricity passed through the electrolyte (solution or melt).
$w \propto Q$, $w = Z\,I\,t$ ($Q = It$)

(ii) Second law: the amounts of different substances liberated by the same quantity of electricity passing through the electrolytic solution are proportional to their chemical equivalent weights (atomic mass of metal ÷ number of electrons required to reduce the cation).`,

  '2025M-14': r`Cell reaction: $\ce{2Fe^{3+} + 2I^- -> 2Fe^{2+} + I2}$, $n = 2$
$E^\circ_{cell} = E^\circ_{\ce{Fe^{3+}/Fe^{2+}}} - E^\circ_{\ce{I2/I^-}}$
$E^\circ_{cell} = 0.77 - 0.54 = 0.23$ V

Standard Gibbs energy:
$\Delta_rG^\circ = -nFE^\circ_{cell}$
$= -2 \times 96487 \times 0.23$
$= -44384$ J mol⁻¹ $= -44.38$ kJ mol⁻¹

Equilibrium constant:
$\log K_c = \dfrac{nE^\circ_{cell}}{0.059} = \dfrac{2 \times 0.23}{0.059} = 7.797$
$K_c = \text{antilog}(7.797) = 6.26 \times 10^7$`,

  '2025M-23': r`Fuel cell ($\ce{H2}$–$\ce{O2}$, conc. NaOH electrolyte):
${H_FUEL_REACTIONS}

Mercury cell (Zn–Hg amalgam anode, HgO + carbon paste cathode, KOH + ZnO paste electrolyte):
Anode: $\ce{Zn(Hg) + 2OH^- -> ZnO(s) + H2O + 2e^-}$
Cathode: $\ce{HgO + H2O + 2e^- -> Hg(l) + 2OH^-}$
Overall: $\ce{Zn(Hg) + HgO(s) -> ZnO(s) + Hg(l)}$`,

  '2025S-1': r`$\Lambda_m = \dfrac{\kappa \times 1000}{c} = \dfrac{4.95 \times 10^{-5} \times 1000}{0.001028}$
$\Lambda_m = 48.15$ S cm² mol⁻¹

Degree of dissociation:
$\alpha = \dfrac{\Lambda_m}{\Lambda^\circ_m} = \dfrac{48.15}{390.5} = 0.1233$`,

  '2025S-14': r`Cell reaction: $\ce{Mg(s) + Cu^{2+}(aq) -> Mg^{2+}(aq) + Cu(s)}$, $n = 2$
$E^\circ_{cell} = 0.34 - (-2.36) = 2.70$ V

Nernst equation:
$E_{cell} = E^\circ_{cell} - \dfrac{0.059}{2}\log\dfrac{[\ce{Mg^{2+}}]}{[\ce{Cu^{2+}}]}$
$2.67 = 2.70 - 0.0295\log\dfrac{x}{0.0001}$
$\log\dfrac{x}{0.0001} = \dfrac{0.03}{0.0295} = 1.017$
$\dfrac{x}{0.0001} = 10.4$
$x = 1.04 \times 10^{-3}$ M

The concentration of $\ce{Mg^{2+}}$ in the anode half cell is about 0.001 M.`,

  '2025S-23': r`Principle: fuel cells are galvanic cells designed to convert the energy of combustion of fuels like hydrogen, methane, methanol etc. directly into electrical energy. Reactants are fed continuously to the electrodes and products are removed continuously.

Construction: hydrogen and oxygen are bubbled through porous carbon electrodes into concentrated aqueous sodium hydroxide solution. Catalysts like finely divided platinum or palladium are incorporated into the electrodes to increase the rate of the electrode reactions.

Reactions:
${H_FUEL_REACTIONS}

The cell runs continuously as long as the reactants are supplied. Its efficiency is about 70%, compared with about 40% for thermal plants. It was used for electrical power in the Apollo space programme.`,

  '2024S-1': r`$\Lambda_m = \dfrac{\kappa \times 1000}{c} = \dfrac{4.9 \times 10^{-5} \times 1000}{0.001}$
$\Lambda_m = 49$ S cm² mol⁻¹

Degree of dissociation:
$\alpha = \dfrac{\Lambda_m}{\Lambda^\circ_m} = \dfrac{49}{390.5} = 0.1255$`,

  '2024S-14': r`Cell reaction: $\ce{Mg(s) + Cl2(g) -> Mg^{2+}(aq) + 2Cl^-(aq)}$, $n = 2$
$E^\circ_{cell} = 1.36 - (-2.36) = 3.72$ V

Nernst equation:
$E_{cell} = E^\circ_{cell} - \dfrac{0.059}{2}\log\dfrac{[\ce{Mg^{2+}}][\ce{Cl^-}]^2}{p_{\ce{Cl2}}}$
$E_{cell} = 3.72 - 0.0295\log\left[(0.001)(0.02)^2\right]$
$E_{cell} = 3.72 - 0.0295\log(4 \times 10^{-7})$
$E_{cell} = 3.72 - 0.0295 \times (-6.398)$
$E_{cell} = 3.72 + 0.189 = 3.909$ V`,

  '2024S-23': CHEM_2024_MAIN['23'],

  '2023M-2': r`For the hydrogen electrode: $\ce{H^+ + e^- -> 1/2H2(g)}$
$E = E^\circ - \dfrac{0.059}{1}\log\dfrac{1}{[\ce{H^+}]}$
$E = 0 - 0.059 \times \text{pH}$ ($E^\circ = 0$)
pH = 10:
$E = -0.059 \times 10 = -0.59$ V`,

  '2023M-3': r`Kohlrausch law of independent migration of ions: the limiting molar conductivity of an electrolyte can be represented as the sum of the individual contributions of the anion and cation of the electrolyte.

If an electrolyte gives $\nu_+$ cations and $\nu_-$ anions:
$\Lambda^\circ_m = \nu_+\lambda^\circ_+ + \nu_-\lambda^\circ_-$

Example:
$\Lambda^\circ_m(\ce{NaCl}) = \lambda^\circ_{\ce{Na^+}} + \lambda^\circ_{\ce{Cl^-}}$
$= 50.1 + 76.3 = 126.4$ S cm² mol⁻¹

(Kohlrausch noticed that $\Lambda^\circ_m(\ce{KCl}) - \Lambda^\circ_m(\ce{NaCl}) \approx 23.4$ S cm² mol⁻¹, the same as for KBr − NaBr and KI − NaI.)
Use: $\Lambda^\circ_m$ of a weak electrolyte like acetic acid is found from those of strong electrolytes.`,

  '2023M-21': r`Limiting molar conductivity: when the concentration approaches zero (infinite dilution), the molar conductivity is called limiting molar conductivity, $\Lambda^\circ_m$.

For strong electrolytes, $\Lambda_m$ increases slowly with dilution and is given by:
$\Lambda_m = \Lambda^\circ_m - A\,c^{1/2}$
A plot of $\Lambda_m$ against $c^{1/2}$ is a straight line with intercept $\Lambda^\circ_m$ and slope $-A$.
The constant $A$, for a given solvent and temperature, depends on the type of electrolyte, i.e. the charges on the ions. NaCl, $\ce{CaCl2}$ and $\ce{MgSO4}$ are 1-1, 2-1 and 2-2 electrolytes; all electrolytes of one type have the same $A$.
$\Lambda^\circ_m$ of a strong electrolyte is obtained by extrapolating the line to zero concentration.`,

  '2023M-24': r`${KOHLRAUSCH_HAC}

Molar conductivity of 0.00241 M acetic acid:
$\Lambda_m = \dfrac{\kappa \times 1000}{c} = \dfrac{7.896 \times 10^{-5} \times 1000}{0.00241}$
$\Lambda_m = 32.76$ S cm² mol⁻¹

$\alpha = \dfrac{\Lambda_m}{\Lambda^\circ_m} = \dfrac{32.76}{390.5} = 0.0839$

$K_a = \dfrac{c\alpha^2}{1 - \alpha} = \dfrac{0.00241 \times (0.0839)^2}{1 - 0.0839}$
$K_a = 1.85 \times 10^{-5}$ mol L⁻¹`,

  '2023S-21': r`Daniell cell: $\ce{Zn(s) + Cu^{2+}(aq) -> Zn^{2+}(aq) + Cu(s)}$

Electrode potentials (Nernst):
Cathode: $E_{\ce{Cu^{2+}/Cu}} = E^\circ_{\ce{Cu^{2+}/Cu}} - \dfrac{RT}{2F}\ln\dfrac{1}{[\ce{Cu^{2+}}]}$
Anode: $E_{\ce{Zn^{2+}/Zn}} = E^\circ_{\ce{Zn^{2+}/Zn}} - \dfrac{RT}{2F}\ln\dfrac{1}{[\ce{Zn^{2+}}]}$

Cell potential:
$E_{cell} = E_{\ce{Cu^{2+}/Cu}} - E_{\ce{Zn^{2+}/Zn}}$
$= E^\circ_{\ce{Cu^{2+}/Cu}} - E^\circ_{\ce{Zn^{2+}/Zn}}$
$\quad - \dfrac{RT}{2F}\left[\ln\dfrac{1}{[\ce{Cu^{2+}}]} - \ln\dfrac{1}{[\ce{Zn^{2+}}]}\right]$
$E_{cell} = E^\circ_{cell} - \dfrac{RT}{2F}\ln\dfrac{[\ce{Zn^{2+}}]}{[\ce{Cu^{2+}}]}$

At 298 K, converting to log base 10 (R = 8.314, F = 96487):
$E_{cell} = E^\circ_{cell} - \dfrac{0.059}{2}\log\dfrac{[\ce{Zn^{2+}}]}{[\ce{Cu^{2+}}]}$

$E_{cell}$ increases with increase in $[\ce{Cu^{2+}}]$ and decrease in $[\ce{Zn^{2+}}]$.`,

  '2023S-23': SILVER('Zn'),

  '2023S-24': r`(a) Dry cell:
Anode: $\ce{Zn(s) -> Zn^{2+} + 2e^-}$
Cathode: $\ce{MnO2 + NH4^+ + e^- -> MnO(OH) + NH3}$

(b) Lead storage battery (discharging):
Anode: $\ce{Pb(s) + SO4^{2-}(aq) -> PbSO4(s) + 2e^-}$
Cathode: $\ce{PbO2(s) + SO4^{2-}(aq) + 4H^+(aq) + 2e^-}$
$\ce{-> PbSO4(s) + 2H2O(l)}$

(c) Fuel cell ($\ce{H2}$–$\ce{O2}$):
Anode: $\ce{2H2(g) + 4OH^-(aq) -> 4H2O(l) + 4e^-}$
Cathode: $\ce{O2(g) + 2H2O(l) + 4e^- -> 4OH^-(aq)}$

(d) Corrosion of iron:
Anode: $\ce{2Fe(s) -> 2Fe^{2+} + 4e^-}$
Cathode: $\ce{O2(g) + 4H^+(aq) + 4e^- -> 2H2O(l)}$`,

  '2022M-1': r`Ionic conductance: the conductance of electricity by ions present in solution is called electrolytic or ionic conductance. When electrolytes are dissolved in water they furnish their own ions, so the conductivity increases.

The conductivity of electrolytic (ionic) solutions depends on:
(i) the nature of the electrolyte added
(ii) size of the ions produced and their solvation
(iii) the nature of the solvent and its viscosity
(iv) concentration of the electrolyte
(v) temperature (it increases with increase of temperature)`,

  '2022M-2': r`Quantity of electricity:
$Q = I \times t = 5 \times (20 \times 60) = 6000$ C

$\ce{Ni^{2+} + 2e^- -> Ni}$: 2 F (2 × 96487 C) deposit 58.7 g Ni

Mass of Ni $= \dfrac{58.7 \times 6000}{2 \times 96487}$
Mass of Ni $= 1.825$ g`,

  '2022M-21': r`Standard hydrogen electrode (SHE) is the reference half-cell, represented as $\ce{Pt(s) | H2(g) | H^+(aq)}$. It is assigned zero potential at all temperatures for the reaction:
$\ce{H^+(aq) + e^- -> 1/2H2(g)}$

Construction: it consists of a platinum electrode coated with platinum black. The electrode is dipped in an acidic solution and pure hydrogen gas is bubbled through it. The concentration of both the reduced and oxidised forms of hydrogen is kept at unity: pressure of $\ce{H2}$ gas is 1 bar and concentration of $\ce{H^+}$ in the solution is 1 M.

Use: the potential of a single electrode cannot be measured. A cell is made with SHE as anode and the other half-cell as cathode. As $E^\circ$ of SHE is zero, the measured emf equals the standard reduction potential of the other half-cell:
$E^\circ_{cell} = E^\circ_R - E^\circ_L = E^\circ_R - 0 = E^\circ_R$`,

  '2022M-23': VARIATION,

  '2022S-1': KOHLRAUSCH_HAC,

  '2022S-2': r`$\ce{Co(s) + Ni^{2+}(aq) -> Co^{2+}(aq) + Ni(s)}$, $n = 2$
$E^\circ_{cell} = E^\circ_{\ce{Ni^{2+}/Ni}} - E^\circ_{\ce{Co^{2+}/Co}}$
$E^\circ_{cell} = -0.25 - (-0.28) = 0.03$ V

$\log K_c = \dfrac{nE^\circ_{cell}}{0.059} = \dfrac{2 \times 0.03}{0.059} = 1.017$
$K_c = \text{antilog}(1.017) = 10.4$`,

  '2022S-21': r`By Kohlrausch law:
$\Lambda^\circ_m(\ce{HCOOH}) = \lambda^\circ_{\ce{H^+}} + \lambda^\circ_{\ce{HCOO^-}}$
$= 349.6 + 54.6 = 404.2$ S cm² mol⁻¹

Degree of dissociation:
$\alpha = \dfrac{\Lambda_m}{\Lambda^\circ_m} = \dfrac{46.1}{404.2} = 0.114$

Dissociation constant:
$K_a = \dfrac{c\alpha^2}{1 - \alpha} = \dfrac{0.025 \times (0.114)^2}{1 - 0.114}$
$K_a = 3.67 \times 10^{-4}$ mol L⁻¹`,

  '2022S-23': [ELECTROLYSIS.i, ELECTROLYSIS.ii, '(iii) ' + ELECTROLYSIS.iii, ELECTROLYSIS.iv].join('\n\n'),

  '2021M-1': r`(i) Oxidation of $\ce{H2O}$ to $\ce{O2}$:
$\ce{H2O -> 1/2O2 + 2H^+ + 2e^-}$
1 mol $\ce{H2O}$ needs 2 mol electrons = 2 F
$Q = 2 \times 96487 = 1.93 \times 10^5$ C

(ii) Oxidation of FeO to $\ce{Fe2O3}$ (Fe +2 → +3):
$\ce{FeO + 1/2H2O -> 1/2Fe2O3 + H^+ + e^-}$
1 mol FeO needs 1 mol electrons = 1 F
$Q = 96487$ C`,

  '2021M-2': [ELECTROLYSIS.i, '(ii) ' + ELECTROLYSIS.iii].join('\n\n'),

  '2021M-14': MG_CU,
  '2026M-14': MG_CU,

  '2021M-24': r`The potential of an individual half-cell cannot be measured, so it is measured against the standard hydrogen electrode (SHE), $\ce{Pt(s) | H2(g, 1 bar) | H^+(aq, 1 M)}$, whose potential is taken as zero.
A cell is made with SHE as the left electrode (anode) and the other half-cell as the right electrode. Then:
$E^\circ_{cell} = E^\circ_R - E^\circ_L = E^\circ_R - 0 = E^\circ_R$

Copper: cell $\ce{Pt(s) | H2(g, 1 bar) | H^+(aq, 1 M)}$
$\ce{|| Cu^{2+}(aq, 1 M) | Cu}$
Measured emf = 0.34 V. Copper acts as cathode:
$\ce{H2(g) + Cu^{2+}(aq) -> 2H^+(aq) + Cu(s)}$
So $E^\circ_{\ce{Cu^{2+}/Cu}} = +0.34$ V

Zinc: cell $\ce{Pt(s) | H2(g, 1 bar) | H^+(aq, 1 M)}$
$\ce{|| Zn^{2+}(aq, 1 M) | Zn}$
Measured emf = −0.76 V, i.e. the reaction actually goes the other way; zinc acts as anode:
$\ce{Zn(s) + 2H^+(aq) -> Zn^{2+}(aq) + H2(g)}$
So $E^\circ_{\ce{Zn^{2+}/Zn}} = -0.76$ V

A positive $E^\circ$ means the couple is a weaker reducing agent than $\ce{H^+/H2}$; a negative $E^\circ$ means a stronger reducing agent.`,

  '2020M-9': r`$t = 8 \times 60 + 45 = 525$ s
$Q = I \times t = 5 \times 525 = 2625$ C

$\ce{Cu^{2+} + 2e^- -> Cu}$: 2 F (2 × 96487 C) deposit 63.5 g Cu

Mass of Cu $= \dfrac{63.5 \times 2625}{2 \times 96487}$
Mass of Cu $= 0.864$ g`,

  '2020M-20': r`(i) $\ce{Ca^{2+} + 2e^- -> Ca}$
40 g Ca needs 2 F
20 g Ca $= 0.5$ mol needs $0.5 \times 2 = 1$ F

(ii) $\ce{Al^{3+} + 3e^- -> Al}$
27 g Al needs 3 F
40 g Al $= \dfrac{40}{27} = 1.48$ mol
needs $\dfrac{40 \times 3}{27} = 4.44$ F`,

  '2020M-23': r`Cell constant:
$G^* = \kappa \times R = 1.29$ S m⁻¹ $\times 100\ \Omega = 129$ m⁻¹ $= 1.29$ cm⁻¹

Conductivity of 0.03 M KCl:
$\kappa = \dfrac{G^*}{R} = \dfrac{129\ \text{m}^{-1}}{520\ \Omega} = 0.248$ S m⁻¹

Molar conductivity (c = 0.03 mol L⁻¹ = 30 mol m⁻³):
$\Lambda_m = \dfrac{\kappa}{c} = \dfrac{0.248}{30}$
$\Lambda_m = 8.27 \times 10^{-3}$ S m² mol⁻¹
$= 82.7$ S cm² mol⁻¹`,

  '2020M-24': SILVER('Ni'),

  '2026M-4': r`Quantity of electricity:
$Q = I \times t = 5 \times (20 \times 60) = 6000$ C

$\ce{Ni^{2+} + 2e^- -> Ni}$: 2 F (2 × 96487 C) deposit 58.7 g Ni

Mass of Ni $= \dfrac{58.7 \times 6000}{2 \times 96487}$
Mass of Ni $= 1.825$ g`,

  '2026M-23': r`Conductivity ($\kappa$): the conductance of a solution of 1 cm length and area of cross section 1 cm², i.e. the conductance of one unit volume of solution. $\kappa = \dfrac{1}{\rho} = G\dfrac{l}{A}$; unit S cm⁻¹ (S m⁻¹ in SI).

Molar conductivity ($\Lambda_m$): the conductance of the volume $V$ of solution containing one mole of electrolyte kept between two electrodes at unit distance.
$\Lambda_m = \dfrac{\kappa}{c}$ (or $\dfrac{\kappa \times 1000}{c}$ in S cm² mol⁻¹ when $c$ is in mol L⁻¹)

Variation with concentration:
${VARIATION}`,
}
