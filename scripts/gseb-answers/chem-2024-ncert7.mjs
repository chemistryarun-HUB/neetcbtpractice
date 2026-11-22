// Chemistry 2024 Main, Part B: the 7 answers the board copy skips, rewritten
// in the wording of the NCERT Class XII textbook (Rationalised 2023-24,
// Arun's PDFs): lech101 Solutions 1.4.1, lech102 Electrochemistry 2.8,
// lech104 d- and f-Block 4.3.13 / 4.5.2 / K2Cr2O7, lech105 Coordination
// Compounds 5.5.1, lech203 Aldehydes, Ketones 8.4 (ii).
const r = String.raw

export const NCERT_ANSWERS = {
  3: r`Lanthanoid contraction: the overall decrease in atomic and ionic radii from lanthanum to lutetium is called lanthanoid contraction. It is a unique feature in the chemistry of the lanthanoids.

Cause: the filling of 4f orbitals before 5d orbitals results in a regular decrease in atomic radii. It is due to the imperfect shielding of one electron by another in the same sub-shell. The shielding of one 4f electron by another is less than that of one d electron by another, so with increasing nuclear charge along the series there is a fairly regular decrease in size.

Consequence: it compensates for the expected increase in atomic size with increasing atomic number. So the second (4d) and third (5d) transition series have similar radii (e.g. Zr 160 pm, Hf 159 pm) and very similar physical and chemical properties.`,

  4: r`Interstitial compounds are those which are formed when small atoms like H, C or N are trapped inside the crystal lattices of metals. They are usually non-stoichiometric and are neither typically ionic nor covalent, for example $\ce{TiC}$, $\ce{Mn4N}$, $\ce{Fe3H}$, $\ce{VH_{0.56}}$ and $\ce{TiH_{1.7}}$. The formulas do not correspond to any normal oxidation state of the metal.

Characteristics:
(i) They have high melting points, higher than those of pure metals.
(ii) They are very hard; some borides approach diamond in hardness.
(iii) They retain metallic conductivity.
(iv) They are chemically inert.`,

  10: r`Aldehydes are generally more reactive than ketones in nucleophilic addition reactions due to steric and electronic reasons.

Steric reason: the presence of two relatively large substituents in ketones hinders the approach of the nucleophile to the carbonyl carbon more than in aldehydes, which have only one such substituent.

Electronic reason: two alkyl groups in ketones reduce the electrophilicity of the carbonyl carbon more effectively than the one alkyl group in aldehydes.

So, e.g., $\ce{HCHO}$ > $\ce{CH3CHO}$ > $\ce{CH3COCH3}$ in reactivity.`,

  13: r`Consider a binary solution of two volatile liquids, components 1 and 2. In a closed vessel both components evaporate and an equilibrium is established between the vapour phase and the liquid phase. Let $p_{total}$ be the total vapour pressure and $p_1$, $p_2$ the partial vapour pressures, with mole fractions $x_1$ and $x_2$.

Raoult's law: for a solution of volatile liquids, the partial vapour pressure of each component of the solution is directly proportional to its mole fraction present in solution.

For component 1: $p_1 \propto x_1$, so $p_1 = p_1^0 x_1$
For component 2: $p_2 = p_2^0 x_2$
($p_1^0$, $p_2^0$ = vapour pressures of the pure components at the same temperature)

According to Dalton's law of partial pressures:
$p_{total} = p_1 + p_2$
$p_{total} = x_1 p_1^0 + x_2 p_2^0$
$= (1 - x_2)\,p_1^0 + x_2 p_2^0$
$p_{total} = p_1^0 + (p_2^0 - p_1^0)\,x_2$

Conclusions:
(i) Total vapour pressure over the solution can be related to the mole fraction of any one component.
(ii) Total vapour pressure over the solution varies linearly with the mole fraction of component 2.
(iii) Depending on the vapour pressures of the pure components 1 and 2, total vapour pressure over the solution decreases or increases with the increase of the mole fraction of component 1.`,

  16: r`Dichromates are prepared from chromates, which are obtained by fusion of chromite ore ($\ce{FeCr2O4}$) with sodium or potassium carbonate in free access of air:
$\ce{4FeCr2O4 + 8Na2CO3 + 7O2 -> 8Na2CrO4 + 2Fe2O3 + 8CO2}$

The yellow solution of sodium chromate is filtered and acidified with sulphuric acid to give orange sodium dichromate, $\ce{Na2Cr2O7.2H2O}$:
$\ce{2Na2CrO4 + 2H^+ -> Na2Cr2O7 + 2Na^+ + H2O}$

Sodium dichromate is more soluble than potassium dichromate, so the solution is treated with potassium chloride and orange crystals of potassium dichromate crystallise out:
$\ce{Na2Cr2O7 + 2KCl -> K2Cr2O7 + 2NaCl}$

Effect of increasing pH: chromates and dichromates are interconvertible in aqueous solution depending on pH. On increasing pH (adding $\ce{OH^-}$), orange dichromate changes to yellow chromate:
$\ce{Cr2O7^{2-} + 2OH^- -> 2CrO4^{2-} + H2O}$
(In acid the change is reversed: $\ce{2CrO4^{2-} + 2H^+ -> Cr2O7^{2-} + H2O}$.) The oxidation state of chromium (+6) is the same in both.`,

  23: r`Corrosion slowly coats the surfaces of metallic objects with oxides or other salts of the metal. In corrosion a metal is oxidised by loss of electrons to oxygen and formation of oxides. Examples: rusting of iron, tarnishing of silver, green coating on copper and bronze.

Chemistry of corrosion of iron (an electrochemical phenomenon, needs water and air):
At a particular spot the iron is oxidised; this spot behaves as anode:
Anode: $\ce{2Fe(s) -> 2Fe^{2+} + 4e^-}$, $E^\circ_{(Fe^{2+}/Fe)} = -0.44$ V
The electrons move through the metal to another spot and reduce oxygen in the presence of $\ce{H^+}$ (from $\ce{H2CO3}$ formed by dissolution of $\ce{CO2}$ from air in water). This spot behaves as cathode:
Cathode: $\ce{O2(g) + 4H^+(aq) + 4e^- -> 2H2O(l)}$, $E^\circ = 1.23$ V
Overall: $\ce{2Fe(s) + O2(g) + 4H^+(aq) -> 2Fe^{2+}(aq) + 2H2O(l)}$, $E^\circ_{cell} = 1.67$ V
The ferrous ions are further oxidised by atmospheric oxygen to ferric ions, which come out as rust, hydrated ferric oxide:
$\ce{2Fe^{2+}(aq) + 2H2O(l) + 1/2O2(g) -> Fe2O3(s) + 4H^+(aq)}$ (rust = $\ce{Fe2O3.xH2O}$)

Prevention:
(i) Prevent the surface from coming in contact with the atmosphere by covering it with paint or some chemicals (e.g. bisphenol).
(ii) Cover the surface with other metals (Sn, Zn, etc.) that are inert or react to save the object.
(iii) Electrochemical method: provide a sacrificial electrode of another metal (like Mg, Zn) which corrodes itself but saves the object.`,

  25: r`$\ce{[CoF6]^{3-}}$:
Cobalt is in +3 oxidation state, $\ce{Co^{3+}}$: $3d^6$.
The complex uses outer orbitals (4d) in hybridisation: one 4s, three 4p and two 4d orbitals → $sp^3d^2$, octahedral.
The 3d electrons stay unpaired (3d: ↿⇂ ↿ ↿ ↿ ↿), so there are four unpaired electrons.
Six pairs of electrons from six $\ce{F^-}$ ions occupy the six $sp^3d^2$ hybrid orbitals.
It is an outer orbital (high spin, spin free) complex and is paramagnetic, with four unpaired electrons.

$\ce{[Ni(CN)4]^{2-}}$:
Nickel is in +2 oxidation state, $\ce{Ni^{2+}}$: $3d^8$ (two unpaired electrons in the free ion).
In the complex the 3d electrons pair up (3d: ↿⇂ ↿⇂ ↿⇂ ↿⇂, one 3d orbital empty), and one 3d, one 4s and two 4p orbitals hybridise → $dsp^2$, square planar.
Each hybrid orbital receives a pair of electrons from a cyanide ion.
There is no unpaired electron, so $\ce{[Ni(CN)4]^{2-}}$ (a low spin complex) is diamagnetic.`,
}
