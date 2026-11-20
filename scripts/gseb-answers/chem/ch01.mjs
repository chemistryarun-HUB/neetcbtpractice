// Ch 1 Solutions. Model answers in NCERT wording (lech101, Rationalised 2023-24).
// Key: <year><M main | S supplementary>-<Part B question number>.
const r = String.raw

const ACETIC = r`Mass of acetic acid $= 0.6 \times 1.06 = 0.636$ g
Moles $= \dfrac{0.636}{60} = 0.0106$ mol, in 1 L ≈ 1 kg water
Molality $m = 0.0106$ mol kg⁻¹

$\Delta T_f$ (calculated) $= K_f\,m = 1.86 \times 0.0106 = 0.0197$ K

van't Hoff factor:
$i = \dfrac{\text{observed } \Delta T_f}{\text{calculated } \Delta T_f} = \dfrac{0.0205}{0.0197} = 1.041$

Acetic acid is a weak electrolyte: $\ce{CH3COOH <=> CH3COO^- + H^+}$
Initial: $n$ mol, 0, 0. At equilibrium: $n(1-\alpha)$, $n\alpha$, $n\alpha$
Total moles $= n(1+\alpha)$, so $i = 1 + \alpha$
$\alpha = 1.041 - 1 = 0.041$

$K_a = \dfrac{[\ce{CH3COO^-}][\ce{H^+}]}{[\ce{CH3COOH}]} = \dfrac{c\alpha^2}{1-\alpha}$
$K_a = \dfrac{0.0106 \times (0.041)^2}{1 - 0.041}$
$K_a = 1.86 \times 10^{-5}$

van't Hoff factor $= 1.041$, dissociation constant $= 1.86 \times 10^{-5}$.`

const CHLORO_ACID = (w, W) => r`Molar mass of $\ce{CH3CH2CHClCOOH}$
$= 4(12) + 7(1) + 35.5 + 2(16) = 122.5$ g mol⁻¹
Moles of acid $= \dfrac{${w}}{122.5} = ${(w / 122.5).toFixed(4)}$ mol
Molality $m = \dfrac{${(w / 122.5).toFixed(4)} \times 1000}{${W}} = 0.3265$ mol kg⁻¹

The acid is weak and partly dissociates:
$\ce{CH3CH2CHClCOOH}$
$\ce{<=> CH3CH2CHClCOO^- + H^+}$
Initial: $m$, 0, 0. At equilibrium: $m(1-\alpha)$, $m\alpha$, $m\alpha$
$K_a = \dfrac{m\alpha^2}{1-\alpha} \approx m\alpha^2$ ($\alpha$ is small)
$\alpha = \sqrt{\dfrac{K_a}{m}} = \sqrt{\dfrac{1.4 \times 10^{-3}}{0.3265}} = 0.0655$

Total moles at equilibrium $= m(1+\alpha)$, so
$i = 1 + \alpha = 1.0655$

$\Delta T_f = i\,K_f\,m$
$\Delta T_f = 1.0655 \times 1.86 \times 0.3265$
$\Delta T_f = 0.65$ K

The freezing point of water is lowered by 0.65 K.`

const AB = r`For a solute: $M_2 = \dfrac{K_f \times w_2 \times 1000}{\Delta T_f \times w_1}$

$M_{\ce{AB2}} = \dfrac{5.1 \times 1 \times 1000}{2.3 \times 20} = 110.87$ g mol⁻¹
$M_{\ce{AB4}} = \dfrac{5.1 \times 1 \times 1000}{1.3 \times 20} = 196.15$ g mol⁻¹

Let the atomic masses of A and B be $a$ and $b$:
$a + 2b = 110.87$ ...(1)
$a + 4b = 196.15$ ...(2)
(2) − (1): $2b = 85.28$, so $b = 42.64$
From (1): $a = 110.87 - 2 \times 42.64 = 25.59$

Atomic mass of A = 25.59 u, atomic mass of B = 42.64 u.`

export const ANSWERS = {
  '2025M-13': r`Freezing point: the freezing point of a substance is the temperature at which the vapour pressure of the substance in its liquid phase is equal to its vapour pressure in the solid phase. At this temperature the solid phase is in dynamic equilibrium with the liquid phase.

When a non-volatile solute is added, the vapour pressure of the solvent decreases, so it becomes equal to that of the solid solvent at a lower temperature. Thus the freezing point decreases.
Depression in freezing point: $\Delta T_f = T_f^0 - T_f$

For a dilute solution, $\Delta T_f$ is directly proportional to molality $m$:
$\Delta T_f \propto m$, so $\Delta T_f = K_f\,m$ ...(1)
$K_f$ = molal depression constant (cryoscopic constant), unit K kg mol⁻¹.

If $w_2$ g of solute of molar mass $M_2$ is present in $w_1$ g of solvent:
$m = \dfrac{w_2 / M_2}{w_1/1000}$
Putting in (1):
$\Delta T_f = \dfrac{K_f \times w_2 \times 1000}{M_2 \times w_1}$
$M_2 = \dfrac{K_f \times w_2 \times 1000}{\Delta T_f \times w_1}$`,

  '2025M-22': CHLORO_ACID(20, 500),
  '2023M-23': CHLORO_ACID(10, 250),

  '2025S-13': r`Ideal solution | Non-ideal solution
(i) Obeys Raoult's law over the entire range of concentration. | Does not obey Raoult's law over the entire range of concentration.
(ii) $\Delta_{mix}H = 0$ and $\Delta_{mix}V = 0$. | $\Delta_{mix}H \neq 0$ and $\Delta_{mix}V \neq 0$.
(iii) A–B interactions are nearly equal to A–A and B–B interactions. | A–B interactions are weaker (positive deviation) or stronger (negative deviation) than A–A and B–B interactions.
(iv) Vapour pressure equals that predicted by Raoult's law. | Vapour pressure is higher or lower than predicted.
Examples: n-hexane + n-heptane, benzene + toluene. | Examples: ethanol + acetone (positive deviation), chloroform + acetone (negative deviation).`,

  '2025S-22': AB,
  '2020M-22': AB,

  '2024S-13': r`Osmosis: when a solution and the pure solvent are separated by a semipermeable membrane (SPM), the solvent molecules flow through the membrane from the pure solvent to the solution. This process of flow of the solvent is called osmosis. Solvent always flows from lower concentration to higher concentration of solution.

Osmotic pressure: the excess pressure that must be applied to a solution to prevent osmosis, i.e. to stop the passage of solvent molecules through a semipermeable membrane into the solution. It is a colligative property.

For dilute solutions, osmotic pressure is proportional to the molarity $C$ at a given temperature $T$:
$\Pi = CRT$
$\Pi = \dfrac{n_2}{V}RT$
($V$ = volume of solution in litres containing $n_2$ moles of solute)

If $w_2$ g of solute of molar mass $M_2$ is present, $n_2 = w_2/M_2$:
$\Pi V = \dfrac{w_2 RT}{M_2}$
$M_2 = \dfrac{w_2 RT}{\Pi V}$

Knowing $w_2$, $T$, $\Pi$ and $V$, the molar mass of the solute can be calculated. This method is widely used for proteins, polymers and other macromolecules.`,

  '2024S-22': r`Molar mass: benzene $\ce{C6H6}$ = 78 g mol⁻¹, toluene $\ce{C7H8}$ = 92 g mol⁻¹
Moles of benzene $= \dfrac{78}{78} = 1$ mol
Moles of toluene $= \dfrac{138}{92} = 1.5$ mol

Mole fractions in the liquid:
$x_{benzene} = \dfrac{1}{1 + 1.5} = 0.4$, $x_{toluene} = 0.6$

Partial vapour pressures (Raoult's law):
$p_{benzene} = x\,p^0 = 0.4 \times 50.7 = 20.28$ mm Hg
$p_{toluene} = 0.6 \times 32.1 = 19.26$ mm Hg
$p_{total} = 20.28 + 19.26 = 39.54$ mm Hg

Mole fraction of benzene in the vapour phase (Dalton's law):
$y_{benzene} = \dfrac{p_{benzene}}{p_{total}} = \dfrac{20.28}{39.54} = 0.513$`,

  '2023M-22': r`Molar mass: $\ce{CHCl3}$ = 119.5 g mol⁻¹, $\ce{CH2Cl2}$ = 85 g mol⁻¹
Moles of $\ce{CHCl3} = \dfrac{50}{119.5} = 0.419$ mol
Moles of $\ce{CH2Cl2} = \dfrac{30}{85} = 0.353$ mol
Total $= 0.772$ mol

$x_{\ce{CH2Cl2}} = \dfrac{0.353}{0.772} = 0.458$
$x_{\ce{CHCl3}} = 1 - 0.458 = 0.542$

(i) $p_{total} = p_1^0 + (p_2^0 - p_1^0)\,x_2$
$p_{total} = 200 + (415 - 200) \times 0.458$
$p_{total} = 200 + 98.5 = 298.5$ mm Hg

(ii) Partial pressures:
$p_{\ce{CH2Cl2}} = 0.458 \times 415 = 190.1$ mm Hg
$p_{\ce{CHCl3}} = 0.542 \times 200 = 108.4$ mm Hg
Mole fractions in vapour phase:
$y_{\ce{CH2Cl2}} = \dfrac{190.1}{298.5} = 0.64$
$y_{\ce{CHCl3}} = \dfrac{108.4}{298.5} = 0.36$`,

  '2023S-14': r`Molar mass: heptane $\ce{C7H16}$ = 100 g mol⁻¹, octane $\ce{C8H18}$ = 114 g mol⁻¹
Moles of heptane $= \dfrac{26.0}{100} = 0.26$ mol
Moles of octane $= \dfrac{35}{114} = 0.307$ mol

$x_{heptane} = \dfrac{0.26}{0.26 + 0.307} = 0.459$
$x_{octane} = 1 - 0.459 = 0.541$

By Raoult's law:
$p_{heptane} = 0.459 \times 105.2 = 48.3$ kPa
$p_{octane} = 0.541 \times 46.8 = 25.3$ kPa
$p_{total} = 48.3 + 25.3 = 73.6$ kPa

The vapour pressure of the mixture is about 73.6 kPa.`,

  '2023S-22': ACETIC,
  '2022M-22': ACETIC,
  '2026M-22': ACETIC,

  '2022S-22': r`Given: $w_2 = 2$ g, $w_1 = 25$ g, $\Delta T_f = 1.62$ K, $K_f = 4.9$ K kg mol⁻¹, $M = 122$ g mol⁻¹

Observed molar mass:
$M_2 = \dfrac{K_f \times w_2 \times 1000}{\Delta T_f \times w_1}$
$M_2 = \dfrac{4.9 \times 2 \times 1000}{1.62 \times 25} = 241.98$ g mol⁻¹

Van't Hoff factor:
$i = \dfrac{\text{normal molar mass}}{\text{abnormal molar mass}}$
$i = \dfrac{122}{241.98} = 0.504$

Dimerisation: $\ce{2C6H5COOH <=> (C6H5COOH)2}$
If $x$ is the degree of association: moles at equilibrium
$= 1 - x + \dfrac{x}{2} = 1 - \dfrac{x}{2}$
$i = 1 - \dfrac{x}{2} = 0.504$
$x = 2(1 - 0.504) = 0.992$

The percentage association of benzoic acid in benzene is 99.2%.`,

  '2021M-13': r`(1) Isotonic: two solutions having the same osmotic pressure at a given temperature are called isotonic solutions. When separated by a semipermeable membrane, no osmosis occurs between them. E.g. the fluid inside blood cells is isotonic with 0.9% (mass/volume) NaCl solution (normal saline), which is safe to inject intravenously.

(2) Hypertonic: a solution having higher osmotic pressure than another. If blood cells are placed in a solution with more than 0.9% (mass/volume) NaCl, water flows out of the cells and they shrink.

(3) Hypotonic: a solution having lower osmotic pressure than another. In a solution with less than 0.9% (mass/volume) NaCl, water flows into the cells and they swell.`,

  '2021M-22': r`(i) Moles of glucose $= \dfrac{18}{180} = 0.1$ mol
Molality $m = \dfrac{0.1}{1\ \text{kg}} = 0.1$ mol kg⁻¹
$\Delta T_b = K_b\,m = 0.52 \times 0.1 = 0.052$ K
Water boils at 373.15 K at 1.013 bar, so the solution boils at
$373.15 + 0.052 = 373.202$ K

(ii) $\Pi = 2.57 \times 10^{-3}$ bar, $V = 200$ cm³ $= 0.200$ L, $T = 300$ K, $w_2 = 1.26$ g, $R = 0.083$ L bar mol⁻¹ K⁻¹
$M_2 = \dfrac{w_2 RT}{\Pi V}$
$M_2 = \dfrac{1.26 \times 0.083 \times 300}{2.57 \times 10^{-3} \times 0.200}$
$M_2 = 61{,}022$ g mol⁻¹

The molar mass of the protein is about 61,022 g mol⁻¹.`,

  '2020M-13': r`Henry's law: $p = K_H\,x$
Mole fraction of $\ce{N2}$ in water:
$x_{\ce{N2}} = \dfrac{p_{\ce{N2}}}{K_H} = \dfrac{0.987\ \text{bar}}{76{,}480\ \text{bar}}$
$x_{\ce{N2}} = 1.29 \times 10^{-5}$

1 litre of water $= 1000$ g $= \dfrac{1000}{18} = 55.5$ mol
If $n$ = moles of $\ce{N2}$:
$x_{\ce{N2}} = \dfrac{n}{n + 55.5} \approx \dfrac{n}{55.5}$
$n = 1.29 \times 10^{-5} \times 55.5 = 7.16 \times 10^{-4}$ mol

$= 0.716$ mmol of $\ce{N2}$ dissolve in 1 litre of water.`,

  '2026M-13': r`Van't Hoff law of osmotic pressure: for dilute solutions, the osmotic pressure is proportional to the molar concentration of the solution at a given temperature, and to the absolute temperature at a given concentration.

Mathematical formation:
(i) At constant temperature (Boyle–van't Hoff law): $\Pi \propto C$
(ii) At constant concentration (Charles–van't Hoff law): $\Pi \propto T$
Combining: $\Pi \propto CT$
$\Pi = CRT$
$R$ = gas constant (0.083 L bar mol⁻¹ K⁻¹). This is like the ideal gas equation.

Formula for osmotic pressure:
$C = \dfrac{n_2}{V}$ ($n_2$ moles of solute in $V$ litres of solution)
$\Pi = \dfrac{n_2}{V}RT$
With $n_2 = \dfrac{w_2}{M_2}$:
$\Pi = \dfrac{w_2 RT}{M_2 V}$
So the molar mass of solute: $M_2 = \dfrac{w_2 RT}{\Pi V}$`,
}
