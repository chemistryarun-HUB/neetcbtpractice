// Part B model answers for GSEB Chemistry 2024 Main Paper (052, 13-03-2024).
// BOARD: taken from the model answer copy published by GSEB (sent by Arun,
// 2026-11-20), typed out, with its slips corrected (noted per answer).
// NCERT: the board copy skips these (the student chose other questions), so
// they are written from the NCERT textbook.
const r = String.raw

export const SOURCE = Object.fromEntries([
  [1, 'BOARD'], [2, 'BOARD'], [3, 'NCERT'], [4, 'NCERT'], [5, 'BOARD'], [6, 'BOARD'],
  [7, 'BOARD'], [8, 'BOARD'], [9, 'BOARD'], [10, 'NCERT'], [11, 'BOARD'], [12, 'BOARD'],
  [13, 'NCERT'], [14, 'BOARD'], [15, 'BOARD'], [16, 'NCERT'], [17, 'BOARD'], [18, 'BOARD'],
  [19, 'BOARD'], [20, 'BOARD'], [21, 'BOARD'], [22, 'BOARD'], [23, 'NCERT'], [24, 'BOARD'],
  [25, 'NCERT'], [26, 'BOARD'], [27, 'BOARD'],
])

export const ANSWERS = {
  1: r`Reactions in a dry cell (Leclanché cell):
Anode (zinc container): $\ce{Zn(s) -> Zn^{2+}(aq) + 2e^-}$
Cathode (carbon rod with $\ce{MnO2}$): $\ce{MnO2 + NH4^+ + e^- -> MnO(OH) + NH3}$`,

  2: r`Given: $[R]_0 = 1.24 \times 10^{-2}$ mol L⁻¹, $[R]_t = 0.20 \times 10^{-2}$ mol L⁻¹, $t = 60$ min. Find $k$.

For a first order reaction:
$k = \dfrac{2.303}{t}\log\dfrac{[R]_0}{[R]_t}$
$k = \dfrac{2.303}{60}\log\dfrac{1.24 \times 10^{-2}}{0.20 \times 10^{-2}} = \dfrac{2.303}{60}\log 6.2$
$k = \dfrac{2.303}{60} \times 0.7924$
$k = 3.04 \times 10^{-2}\ \text{min}^{-1}$

The rate constant of the reaction is $3.04 \times 10^{-2}$ min⁻¹.`,

  3: r`Lanthanoid contraction: in the lanthanoid series (Ce to Lu) the atomic and ionic radii ($\ce{M^{3+}}$) decrease steadily with increasing atomic number. This is called lanthanoid contraction.

Cause: as the atomic number increases, each new electron enters the inner 4f subshell. 4f electrons shield one another (and the outer electrons) very poorly from the nucleus, because of the diffused shape of f orbitals. So the effective nuclear charge felt by the outer electrons increases and the size decreases.

Consequence: the radii of the 5d (third transition) series elements are almost the same as those of the 4d (second) series, e.g. Zr (160 pm) and Hf (159 pm).`,

  4: r`Interstitial compounds are formed when small atoms like H, C or N are trapped inside the crystal lattice (in the interstitial spaces) of metals. Examples: $\ce{TiC}$, $\ce{Mn4N}$, $\ce{Fe3H}$, $\ce{VH_{0.56}}$. They are usually non-stoichiometric and neither typically ionic nor covalent.

Characteristics (any two):
(i) They have high melting points, higher than those of the pure metals.
(ii) They are very hard; some borides are almost as hard as diamond.
(iii) They retain metallic conductivity.
(iv) They are chemically inert.`,

  5: r`Main postulates of Werner's theory:
(1) In coordination compounds, the metal shows two types of linkages (valences): primary and secondary.
(2) Primary valences are normally ionisable and are satisfied by negative ions.
(3) Secondary valences are non-ionisable. They are satisfied by neutral molecules or negative ions. The secondary valence is equal to the coordination number and is fixed for a metal.
(4) The ions/groups bound to the metal by secondary linkages have characteristic spatial arrangements (geometries) corresponding to different coordination numbers.`,

  6: r`(i) $\ce{K3[Cr(C2O4)3]}$: Potassium trioxalatochromate(III)
(ii) $\ce{[CoCl2(en)2]Cl}$: Dichloridobis(ethane-1,2-diamine)cobalt(III) chloride`,

  7: r`Finkelstein reaction: when an alkyl chloride or alkyl bromide is heated with sodium iodide in dry acetone, an alkyl iodide is formed. This halogen exchange reaction is called the Finkelstein reaction.

$\ce{CH3Cl + NaI ->[\text{dry acetone}] CH3I + NaCl v}$
(chloromethane → iodomethane)

$\ce{CH3CH2Br + NaI ->[\text{dry acetone}] CH3CH2I + NaBr v}$
(bromoethane → iodoethane)

NaCl and NaBr are not soluble in dry acetone and separate as a white precipitate, which drives the reaction forward (Le Chatelier's principle).`,

  8: r`Step 1: Benzene reacts with chlorine in the presence of anhydrous $\ce{AlCl3}$ to give chlorobenzene.
$\ce{C6H6 + Cl2 ->[\text{anhyd.}~AlCl3] C6H5Cl + HCl}$

Step 2: Chlorobenzene reacts with sodium metal in dry ether (Fittig reaction) to give diphenyl.
$\ce{2C6H5Cl + 2Na ->[\text{dry ether}] C6H5-C6H5 + 2NaCl}$
(chlorobenzene → diphenyl)`,

  9: r`Phenol from cumene (isopropylbenzene):
(1) Cumene is oxidised by oxygen of air to cumene hydroperoxide.
(2) Cumene hydroperoxide is treated with dilute acid ($\ce{H2SO4}$) to give phenol. Acetone is obtained as a by-product in large amount.

$\ce{C6H5CH(CH3)2 ->[O2~\text{(air)}] C6H5C(CH3)2-O-OH}$
(cumene → cumene hydroperoxide)

$\ce{C6H5C(CH3)2-O-OH ->[H^+/H2O] C6H5OH + CH3COCH3}$
(phenol + acetone)`,

  10: r`Aldehydes are generally more reactive than ketones in nucleophilic addition reactions. Two reasons:

(i) Steric reason: in ketones the carbonyl carbon carries two alkyl groups, which hinder the approach of the nucleophile. In aldehydes there is only one such group (and an H atom), so the attack is easier.

(ii) Electronic reason: alkyl groups are electron releasing (+I). Two alkyl groups in ketones reduce the positive charge (electrophilicity) on the carbonyl carbon more than one alkyl group does in aldehydes.

So the order of reactivity is: $\ce{HCHO}$ > $\ce{CH3CHO}$ > $\ce{CH3COCH3}$.`,

  11: r`When glucose is acetylated with acetic anhydride, it gives glucose pentaacetate, which is a stable compound.

$\ce{C6H12O6 ->[(CH3CO)2O] CHO-(CHOCOCH3)4-CH2OCOCH3}$
(glucose → glucose pentaacetate)

This shows that glucose has five –OH groups. Since the pentaacetate is stable, the five –OH groups must be attached to different carbon atoms (two –OH on one carbon would be unstable and lose water).`,

  12: r`Fibrous protein | Globular protein
(i) Insoluble in water. | Soluble in water.
(ii) Polypeptide chains run parallel and are held together by hydrogen and disulphide bonds, giving a fibre-like structure. | Polypeptide chains coil around to give a spherical shape.
(iii) Examples: keratin (hair, wool, silk), myosin (muscles). | Examples: insulin, albumins.`,

  13: r`Consider a binary solution of two volatile liquids 1 and 2 in a closed vessel. At equilibrium the vapour phase above the solution contains both components.

Raoult's law: for a solution of volatile liquids, the partial vapour pressure of each component is directly proportional to its mole fraction in the solution.

For component 1: $p_1 \propto x_1$, so $p_1 = p_1^0 x_1$
For component 2: $p_2 = p_2^0 x_2$
($p_1^0$, $p_2^0$ = vapour pressures of the pure components)

By Dalton's law of partial pressures, the total vapour pressure is
$p_{total} = p_1 + p_2 = p_1^0 x_1 + p_2^0 x_2$
Since $x_1 = 1 - x_2$:
$p_{total} = p_1^0 + (p_2^0 - p_1^0)\,x_2$

Conclusions:
(i) The total vapour pressure over the solution can be related to the mole fraction of any one component.
(ii) The total vapour pressure varies linearly with the mole fraction of component 2.
(iii) Depending on which pure component is more volatile, the total vapour pressure increases or decreases as the mole fraction of component 1 increases.`,

  14: r`Cell reaction: $\ce{H2(g) + Br2(l) -> 2H^+(aq) + 2Br^-(aq)}$, $n = 2$
$E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode} = 1.09 - 0 = 1.09$ V

Nernst equation:
$E_{cell} = E^\circ_{cell} - \dfrac{0.059}{n}\log\dfrac{[H^+]^2[Br^-]^2}{p_{H_2}}$
$E_{cell} = 1.09 - \dfrac{0.059}{2}\log\left[(0.03)^2(0.01)^2\right]$
$= 1.09 - \dfrac{0.059}{2}\log(9 \times 10^{-8})$
$= 1.09 - \dfrac{0.059}{2}(0.9542 - 8)$
$= 1.09 + \dfrac{0.059}{2} \times 7.0458$
$= 1.09 + 0.2078$
$E_{cell} = 1.2978$ V ≈ 1.298 V

The emf of the given cell is 1.298 V.`,

  15: r`Given: $k_1 = 0.02$ s⁻¹ at $T_1 = 500$ K, $k_2 = 0.07$ s⁻¹ at $T_2 = 700$ K. Find $E_a$ and $A$.

$\log\dfrac{k_2}{k_1} = \dfrac{E_a}{2.303R}\left(\dfrac{T_2 - T_1}{T_1T_2}\right)$
$\log\dfrac{0.07}{0.02} = \dfrac{E_a \times 200}{2.303 \times 8.314 \times 500 \times 700}$
$E_a = \dfrac{\log 3.5 \times 2.303 \times 8.314 \times 500 \times 700}{200} = 0.5441 \times 2.303 \times 8.314 \times 1750$
$E_a = 18231$ J mol⁻¹ $= 18.23$ kJ mol⁻¹

Now $\log k_1 = \log A - \dfrac{E_a}{2.303RT_1}$
$\log A = \log 0.02 + \dfrac{18231}{2.303 \times 8.314 \times 500} = -1.699 + 1.904 = 0.205$
$A = \text{antilog}(0.205) = 1.60$ s⁻¹

(The board copy writes the unit of A as J/mol; A has the same unit as $k$, s⁻¹.)`,

  16: r`Preparation of $\ce{K2Cr2O7}$ from chromite ore ($\ce{FeCr2O4}$):

(1) Fusion of chromite ore with sodium carbonate in free access of air gives sodium chromate:
$\ce{4FeCr2O4 + 8Na2CO3 + 7O2 -> 8Na2CrO4 + 2Fe2O3 + 8CO2}$

(2) The yellow sodium chromate solution is filtered and acidified with sulphuric acid to give orange sodium dichromate:
$\ce{2Na2CrO4 + 2H^+ -> Na2Cr2O7 + 2Na^+ + H2O}$

(3) Sodium dichromate solution is treated with potassium chloride. Potassium dichromate, being less soluble, crystallises out:
$\ce{Na2Cr2O7 + 2KCl -> K2Cr2O7 + 2NaCl}$

Effect of increasing pH: chromate and dichromate are interconvertible in aqueous solution depending on pH. On increasing the pH (adding alkali), orange dichromate changes into yellow chromate:
$\ce{Cr2O7^{2-} + 2OH^- -> 2CrO4^{2-} + H2O}$
So the orange solution turns yellow.`,

  17: r`(A) is $\ce{(CH3)2CH-CH2Br}$, 1-bromo-2-methylpropane (isobutyl bromide).

(A) → (B) with alcoholic KOH (dehydrohalogenation):
$\ce{(CH3)2CH-CH2Br ->[\text{alc.}~KOH] (CH3)2C=CH2}$
(B) = 2-methylprop-1-ene

(B) → (C) with HBr (Markovnikov addition):
$\ce{(CH3)2C=CH2 + HBr -> (CH3)3C-Br}$
(C) = 2-bromo-2-methylpropane
(C) is an isomer of (A).

(A) → (D) with sodium in dry ether (Wurtz reaction):
$\ce{2(CH3)2CH-CH2Br + 2Na ->[\text{dry ether}] (CH3)2CH-CH2-CH2-CH(CH3)2 + 2NaBr}$
(D) = 2,5-dimethylhexane
(D), $\ce{C8H18}$, is different from n-octane, which is formed from n-butyl bromide.`,

  18: r`1° alcohol (from methanal):
$\ce{HCHO + RMgX ->[\text{dry ether}] ->[H2O/H^+] RCH2OH + Mg(OH)X}$
e.g. $\ce{HCHO + CH3MgX -> CH3CH2OH}$ (ethanol)

2° alcohol (from other aldehydes):
$\ce{RCHO + R'MgX ->[\text{dry ether}] ->[H2O/H^+] RCH(OH)R' + Mg(OH)X}$
e.g. $\ce{CH3CHO + CH3MgX -> CH3CH(OH)CH3}$ (propan-2-ol)

3° alcohol (from ketones):
$\ce{RCOR' + R''MgX ->[\text{dry ether}] ->[H2O/H^+] RR'C(OH)R'' + Mg(OH)X}$
e.g. $\ce{CH3COCH3 + CH3MgX -> (CH3)3C-OH}$ (2-methylpropan-2-ol)`,

  19: r`Cross aldol condensation: when aldol condensation is carried out between two different aldehydes and/or ketones, it is called cross aldol condensation. If both contain α-hydrogen, a mixture of four products is formed.

Products from ethanal and propanal (dilute NaOH, then heat):
(i) $\ce{CH3-CH=CH-CHO}$: but-2-enal (from two ethanal)
(ii) $\ce{CH3CH2-CH=C(CH3)-CHO}$: 2-methylpent-2-enal (from two propanal)
(iii) $\ce{CH3-CH=C(CH3)-CHO}$: 2-methylbut-2-enal (ethanal + propanal)
(iv) $\ce{CH3CH2-CH=CH-CHO}$: pent-2-enal (propanal + ethanal)`,

  20: r`Gabriel phthalimide synthesis is used to prepare only aliphatic primary amines.

(1) Phthalimide reacts with ethanolic potassium hydroxide to form the potassium salt of phthalimide.
(2) This salt is heated with a primary alkyl halide to give N-alkylphthalimide.
(3) N-alkylphthalimide on alkaline hydrolysis gives the primary amine (and sodium phthalate).

$\ce{C6H4(CO)2NH ->[\text{alc.}~KOH][-H2O] C6H4(CO)2N^-K^+}$
(phthalimide → potassium phthalimide)
$\ce{C6H4(CO)2N^-K^+ + R-X ->[-KX] C6H4(CO)2N-R}$
(N-alkylphthalimide)
$\ce{C6H4(CO)2N-R ->[NaOH(aq)] R-NH2 + C6H4(COO^-Na^+)2}$
(primary amine + sodium phthalate)

Aromatic primary amines cannot be prepared this way, because aryl halides do not undergo nucleophilic substitution with the phthalimide anion.`,

  21: r`Nitrous acid is prepared in situ from sodium nitrite and HCl at low temperature ($\ce{NaNO2 + HCl -> HNO2 + NaCl}$).

Primary aliphatic amine: forms an unstable aliphatic diazonium salt, which decomposes to give an alcohol with quantitative evolution of nitrogen gas.
$\ce{R-NH2 ->[NaNO2 + HCl] [R-N2^+Cl^-] ->[H2O] ROH + N2 ^ + HCl}$
e.g. $\ce{CH3NH2 + HNO2 -> CH3OH + N2 ^ + H2O}$ (methanamine → methanol)

Primary aromatic amine: aniline reacts with nitrous acid at low temperature (273–278 K) to form benzenediazonium chloride, which is stable at this low temperature.
$\ce{C6H5NH2 + NaNO2 + 2HCl ->[\text{273-278 K}] C6H5N2^+Cl^- + NaCl + 2H2O}$
(aniline → benzenediazonium chloride)

(The board copy writes "sodium nitrate"; the reagent is sodium nitrite, $\ce{NaNO2}$.)`,

  22: r`Let benzoic acid = A, benzene = B.
Given: $w_A = 4$ g, $w_B = 50$ g, $\Delta T_f = 1.62$ K, $K_f = 4.9$ K kg mol⁻¹, $M_A = 122$ g mol⁻¹, dimer so $n = 2$.

Molality: $m = \dfrac{w_A \times 1000}{M_A \times w_B} = \dfrac{4 \times 1000}{122 \times 50} = 0.6557$ mol kg⁻¹

$\Delta T_f = i\,K_f\,m$
$i = \dfrac{\Delta T_f}{K_f\,m} = \dfrac{1.62}{4.9 \times 0.6557} = 0.5042$

For association $\ce{2C6H5COOH <=> (C6H5COOH)2}$:
$i = 1 - \alpha + \dfrac{\alpha}{2}$, so $\alpha = \dfrac{(1 - i)\,n}{n - 1} = \dfrac{(1 - 0.5042) \times 2}{2 - 1} = 0.9916$

Percentage association $= 0.9916 \times 100 = 99.2\%$

The acid is 99.2% associated (dimerised) in benzene.`,

  23: r`Corrosion: the slow eating away of the surface of a metal by the action of air, moisture and other substances around it, forming oxides, sulphides, carbonates etc. Rusting of iron is the common example.

Chemistry of corrosion of iron (electrochemical):
At one spot of the iron surface (anode), iron is oxidised:
$\ce{2Fe(s) -> 2Fe^{2+} + 4e^-}$, $E^\circ = -0.44$ V
The electrons move through the metal to another spot (cathode), where oxygen is reduced in the presence of $\ce{H^+}$ (from $\ce{H2CO3}$ formed by $\ce{CO2}$ dissolved in water):
$\ce{O2(g) + 4H^+ + 4e^- -> 2H2O(l)}$, $E^\circ = 1.23$ V
Overall: $\ce{2Fe(s) + O2(g) + 4H^+ -> 2Fe^{2+} + 2H2O(l)}$, $E^\circ_{cell} = 1.67$ V
The ferrous ions are further oxidised by atmospheric oxygen to ferric ions, which form hydrated ferric oxide, rust: $\ce{Fe2O3.xH2O}$

Prevention:
(i) Barrier protection: covering the surface with paint, oil, grease or chemicals (e.g. bisphenol).
(ii) Galvanisation: coating iron with a more active metal such as zinc (sacrificial protection).
(iii) Sacrificial electrode: connecting iron to a more reactive metal like Mg or Zn, which corrodes instead of iron.`,

  24: r`For a first order reaction $\ce{R -> P}$, the rate is directly proportional to the first power of the concentration of the reactant.

Rate $= -\dfrac{d[R]}{dt} = k[R]$
$\dfrac{d[R]}{[R]} = -k\,dt$

Integrating between $t = 0$ (concentration $[R]_0$) and $t$ (concentration $[R]_t$):
$\int_{[R]_0}^{[R]_t}\dfrac{d[R]}{[R]} = -k\int_0^t dt$
$\ln[R]_t - \ln[R]_0 = -kt$
$\ln\dfrac{[R]_0}{[R]_t} = kt$

$k = \dfrac{2.303}{t}\log\dfrac{[R]_0}{[R]_t}$ ...(1)
A plot of $\ln[R]$ against $t$ is a straight line with slope $= -k$.

Half-life: at $t = t_{1/2}$, $[R]_t = \dfrac{[R]_0}{2}$. Putting this in (1):
$k = \dfrac{2.303}{t_{1/2}}\log\dfrac{[R]_0}{[R]_0/2} = \dfrac{2.303}{t_{1/2}}\log 2 = \dfrac{2.303 \times 0.3010}{t_{1/2}}$
$t_{1/2} = \dfrac{0.693}{k}$

So the half-life of a first order reaction is independent of the initial concentration.`,

  25: r`$\ce{[CoF6]^{3-}}$: Co is in +3 state, $\ce{Co^{3+}}$ = $3d^6$.
$\ce{F^-}$ is a weak field ligand, so the 3d electrons do not pair up: the 3d orbitals have 4 unpaired electrons (one pair + four singles).
Hybridisation uses outer orbitals: one 4s, three 4p and two 4d orbitals → $sp^3d^2$ (outer orbital, high spin complex), octahedral.
Six $\ce{F^-}$ ions donate electron pairs into these six hybrid orbitals.
Because of 4 unpaired electrons, $\ce{[CoF6]^{3-}}$ is paramagnetic.

$\ce{[Ni(CN)4]^{2-}}$: Ni is in +2 state, $\ce{Ni^{2+}}$ = $3d^8$ (two unpaired electrons in the free ion).
$\ce{CN^-}$ is a strong field ligand, so the two unpaired 3d electrons pair up, leaving one 3d orbital empty.
Hybridisation: one 3d, one 4s and two 4p orbitals → $dsp^2$, square planar.
Four $\ce{CN^-}$ ions donate electron pairs into these hybrid orbitals.
All electrons are paired, so $\ce{[Ni(CN)4]^{2-}}$ is diamagnetic.`,

  26: r`(i) A tertiary alcohol vapour passed over heated copper at 573 K undergoes dehydration to an alkene:
$\ce{(CH3)3C-OH ->[Cu,~\text{573 K}] (CH3)2C=CH2 + H2O}$
(2-methylpropan-2-ol → 2-methylprop-1-ene)

(ii) Phenol with bromine in $\ce{CS2}$ at low temperature gives monobromophenols:
$\ce{C6H5OH ->[Br2/CS2,~\text{273 K}] \mathit{p}\text{-}BrC6H4OH + \mathit{o}\text{-}BrC6H4OH}$
(p-bromophenol, major + o-bromophenol, minor)

(iii) Phenol with dilute nitric acid at 298 K gives a mixture of ortho and para nitrophenols:
$\ce{C6H5OH ->[\text{dil.}~HNO3] \mathit{o}\text{-}O2NC6H4OH + \mathit{p}\text{-}O2NC6H4OH}$
(o-nitrophenol + p-nitrophenol)
(The board copy writes "dilute nitrous acid" in words; the reagent is dilute nitric acid, as in its equation.)

(iv) Oxidation of phenol with chromic acid gives a conjugated diketone, benzoquinone:
$\ce{C6H5OH ->[Na2Cr2O7/H2SO4] C6H4O2}$
(phenol → p-benzoquinone)`,

  27: r`(i) Fehling test:
Fehling reagent is a mixture of equal amounts of two solutions: Fehling solution A (aqueous copper sulphate) and Fehling solution B (alkaline sodium potassium tartrate, Rochelle salt). They are mixed just before use.
On heating an aliphatic aldehyde with Fehling reagent, a reddish-brown precipitate of cuprous oxide is formed and the aldehyde is oxidised to the carboxylate anion:
$\ce{R-CHO + 2Cu^{2+} + 5OH^- -> RCOO^- + Cu2O v + 3H2O}$
Aromatic aldehydes do not give this test.

(ii) Hell–Volhard–Zelinsky (HVZ) reaction:
Carboxylic acids having an α-hydrogen are halogenated at the α-position on treatment with chlorine or bromine in the presence of a small amount of red phosphorus, giving α-halocarboxylic acids.
$\ce{CH3COOH ->[Cl2/\text{red P}] ClCH2COOH}$
(ethanoic acid → 2-chloroethanoic acid)
$\ce{ClCH2COOH ->[Cl2/\text{red P}] Cl2CHCOOH}$
(→ 2,2-dichloroethanoic acid)`,
}
