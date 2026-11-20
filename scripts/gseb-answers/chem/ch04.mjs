// Ch 4 The d- and f-Block Elements. NCERT wording (lech104, Rationalised 2023-24).
import { AFTER as CHEM_2024_MAIN } from '../chem-2024-wrap.mjs'
const r = String.raw

const SC_ZN = r`On the basis of incompletely filled 3d orbitals in case of scandium atom in its ground state ($3d^1$), it is regarded as a transition element.
Sc (Z = 21): $[\ce{Ar}]\,3d^1 4s^2$

On the other hand, zinc atom has completely filled d orbitals ($3d^{10}$) in its ground state as well as in its oxidised state, hence it is not regarded as a transition element.
Zn (Z = 30): $[\ce{Ar}]\,3d^{10} 4s^2$; $\ce{Zn^{2+}}$: $[\ce{Ar}]\,3d^{10}$`

const COLOUR = r`Transition metal ions generally have incompletely filled d orbitals. When an electron from a lower energy d orbital is excited to a higher energy d orbital (d–d transition), the energy of excitation corresponds to the frequency of light absorbed. This frequency generally lies in the visible region.
The colour observed corresponds to the complementary colour of the light absorbed. The frequency of the light absorbed is determined by the nature of the ligand (in aqueous solution, water molecules are the ligands).
Ions with $d^0$ or $d^{10}$ configuration (e.g. $\ce{Sc^{3+}}$, $\ce{Zn^{2+}}$) cannot show d–d transition and are colourless.`

const ALLOY = r`An alloy is a blend of metals prepared by mixing the components. Alloys may be homogeneous solid solutions in which the atoms of one metal are distributed randomly among the atoms of the other. Such alloys are formed by atoms with metallic radii that are within about 15 percent of each other.
Because of similar radii and other characteristics of transition metals, alloys are readily formed by these metals. The alloys so formed are hard and often have high melting points.
The best known are ferrous alloys: chromium, vanadium, tungsten, molybdenum and manganese are used for the production of a variety of steels and stainless steel. Alloys of transition metals with non transition metals such as brass (copper-zinc) and bronze (copper-tin) are also of considerable industrial importance.`

const K2CR2O7_PREP = r`Dichromates are prepared from chromates, which are obtained by fusion of chromite ore ($\ce{FeCr2O4}$) with sodium or potassium carbonate in free access of air:
$\ce{4FeCr2O4 + 8Na2CO3 + 7O2}$
$\ce{-> 8Na2CrO4 + 2Fe2O3 + 8CO2}$

The yellow solution of sodium chromate is filtered and acidified with sulphuric acid to give orange sodium dichromate, $\ce{Na2Cr2O7.2H2O}$:
$\ce{2Na2CrO4 + 2H^+}$
$\ce{-> Na2Cr2O7 + 2Na^+ + H2O}$

Sodium dichromate is more soluble than potassium dichromate, so the solution is treated with potassium chloride and orange crystals of potassium dichromate crystallise out:
$\ce{Na2Cr2O7 + 2KCl -> K2Cr2O7 + 2NaCl}$`

const KMNO4_PREP = r`Potassium permanganate is prepared by fusion of $\ce{MnO2}$ with an alkali metal hydroxide and an oxidising agent like $\ce{KNO3}$ (or air). This produces the dark green $\ce{K2MnO4}$:
$\ce{2MnO2 + 4KOH + O2}$
$\ce{-> 2K2MnO4 + 2H2O}$
Manganate disproportionates in a neutral or acidic solution to give permanganate:
$\ce{3MnO4^{2-} + 4H^+}$
$\ce{-> 2MnO4^- + MnO2 + 2H2O}$
Commercially it is prepared by the alkaline oxidative fusion of $\ce{MnO2}$ followed by the electrolytic oxidation of manganate(VI) in alkaline solution:
$\ce{MnO4^{2-} ->[\text{electrolytic oxidation}] MnO4^-}$
In the laboratory, a manganese(II) salt is oxidised by peroxodisulphate to permanganate:
$\ce{2Mn^{2+} + 5S2O8^{2-} + 8H2O}$
$\ce{-> 2MnO4^- + 10SO4^{2-} + 16H^+}$`

const OXALATE = r`$\ce{5C2O4^{2-} + 2MnO4^- + 16H^+}$
$\ce{-> 2Mn^{2+} + 8H2O + 10CO2}$`
const FE2 = r`$\ce{5Fe^{2+} + MnO4^- + 8H^+}$
$\ce{-> Mn^{2+} + 4H2O + 5Fe^{3+}}$`

const LN_CONTRACTION = r`Lanthanoid contraction: the overall decrease in atomic and ionic radii from lanthanum to lutetium is called lanthanoid contraction.

Cause: the filling of 4f orbitals before 5d orbitals results in a regular decrease in atomic radii. It is due to the imperfect shielding of one electron by another in the same sub-shell. The shielding of one 4f electron by another is less than that of one d electron by another, so with increasing nuclear charge along the series there is a fairly regular decrease in size.

Consequence: the second (4d) and third (5d) transition series have similar radii (e.g. Zr 160 pm, Hf 159 pm) and very similar physical and chemical properties.`

export const ANSWERS = {
  '2025M-3': r`Disproportionation: when a particular oxidation state becomes less stable relative to other oxidation states, one lower and one higher, it is said to undergo disproportionation.
(i) Manganese(VI) in acidic solution:
$\ce{3MnO4^{2-} + 4H^+}$
$\ce{-> 2MnO4^- + MnO2 + 2H2O}$
(ii) Copper(I) in aqueous solution:
$\ce{2Cu^+(aq) -> Cu^{2+}(aq) + Cu(s)}$`,

  '2025M-4': SC_ZN,
  '2025S-3': SC_ZN,

  '2025M-16': r`Acidified permanganate ($\ce{MnO4^- + 8H^+ + 5e^- -> Mn^{2+} + 4H2O}$):
(i) Iodine is liberated from iodide:
$\ce{10I^- + 2MnO4^- + 16H^+}$
$\ce{-> 2Mn^{2+} + 8H2O + 5I2}$
(ii) $\ce{Fe^{2+}}$ (green) is converted to $\ce{Fe^{3+}}$ (yellow):
${FE2}
(iii) Sulphide is oxidised, sulphur being precipitated:
$\ce{5S^{2-} + 2MnO4^- + 16H^+}$
$\ce{-> 2Mn^{2+} + 8H2O + 5S}$`,

  '2025S-4': COLOUR,

  '2025S-16': r`(i) $\ce{2MnO2 + 4KOH + O2}$
$\ce{-> 2K2MnO4 + 2H2O}$
(ii) In neutral or faintly alkaline solution iodide is oxidised to iodate:
$\ce{2MnO4^- + H2O + I^-}$
$\ce{->[OH^-] 2MnO2 + 2OH^- + IO3^-}$
(iii) Thiosulphate is oxidised almost quantitatively to sulphate:
$\ce{8MnO4^- + 3S2O3^{2-} + H2O}$
$\ce{->[OH^-] 8MnO2 + 6SO4^{2-} + 2OH^-}$`,

  '2024S-3': r`$\ce{TiCl3}$: Ti is in +3 state, $\ce{Ti^{3+}}$ = $[\ce{Ar}]\,3d^1$. It has one electron in the 3d orbital. In aqueous solution this electron can be excited from a lower energy d orbital to a higher energy d orbital (d–d transition) by absorbing light in the visible region, so the solution is coloured (purple).

$\ce{TiCl4}$: Ti is in +4 state, $\ce{Ti^{4+}}$ = $[\ce{Ar}]\,3d^0$. There is no d electron, so no d–d transition is possible and the solution is colourless.`,

  '2024S-4': CHEM_2024_MAIN['4'],
  '2022M-15': CHEM_2024_MAIN['4'],
  '2022S-11': CHEM_2024_MAIN['4'],

  '2024S-16': r`(i) $\ce{Fe^{2+}}$ is oxidised to $\ce{Fe^{3+}}$:
${FE2}
(ii) Oxalate is oxidised to carbon dioxide (at 333 K):
${OXALATE}
(iii) Sulphur dioxide is oxidised to sulphate:
$\ce{5SO2 + 2MnO4^- + 2H2O}$
$\ce{-> 2Mn^{2+} + 5SO4^{2-} + 4H^+}$`,

  '2023M-9': r`Paramagnetism arises from the presence of unpaired electrons.

$\ce{TiCl3}$: $\ce{Ti^{3+}}$ = $[\ce{Ar}]\,3d^1$, one unpaired electron.
$\mu = \sqrt{n(n+2)} = \sqrt{1 \times 3} = 1.73$ BM
So $\ce{TiCl3}$ is paramagnetic.

$\ce{TiCl4}$: $\ce{Ti^{4+}}$ = $[\ce{Ar}]\,3d^0$, no unpaired electron.
$\mu = 0$, so $\ce{TiCl4}$ is diamagnetic.`,

  '2023M-12': ALLOY,
  '2026M-6': ALLOY + r`

Alloy containing lanthanoid metals: mischmetall. It consists of a lanthanoid metal (~95%) and iron (~5%) with traces of S, C, Ca and Al.
Use: a good deal of mischmetall is used in Mg-based alloy to produce bullets, shell and lighter flint.`,

  '2023M-18': r`(i) Transition elements have a large number of unpaired electrons in their atoms. So they have stronger interatomic interaction and hence stronger bonding between atoms (involving (n−1)d electrons besides ns electrons), resulting in higher enthalpies of atomisation.

(ii) $\ce{Cr^{2+}}$ is reducing as its configuration changes from $d^4$ to $d^3$ ($\ce{Cr^{3+}}$), the latter having a stable half-filled $t_{2g}$ level. $\ce{Fe^{2+}}$ ($d^6$) changes to $\ce{Fe^{3+}}$ ($d^5$) less readily. This is shown by $E^\circ$ values: $\ce{Cr^{3+}/Cr^{2+}}$ = −0.41 V and $\ce{Fe^{3+}/Fe^{2+}}$ = +0.77 V. So $\ce{Cr^{2+}}$ is a stronger reducing agent than $\ce{Fe^{2+}}$.

(iii) Cu: $3d^{10}4s^1$. After losing one electron, $\ce{Cu^+}$ has the stable $3d^{10}$ configuration; the second electron must be removed from this stable completely filled d subshell, so the second ionisation enthalpy of Cu is unusually high.
Zn: $3d^{10}4s^2$. $\ce{Zn^+}$ is $3d^{10}4s^1$; the second ionisation removes the 4s electron and gives the stable $3d^{10}$ configuration, so its value is lower.`,

  '2023S-6': r`Lanthanoids | Actinoids
(i) 4f orbitals are filled. | 5f orbitals are filled.
(ii) Mostly +3 oxidation state (+2 and +4 in a few, e.g. Ce⁴⁺, Eu²⁺). | Greater range of oxidation states (+3 to +7), as 5f, 6d and 7s levels are of comparable energies.
(iii) Except promethium, they are non-radioactive. | All are radioactive.
(iv) Lanthanoid contraction is smaller from element to element. | Actinoid contraction is greater from element to element, due to poor shielding by 5f electrons.
(v) Less tendency to form complexes. | Greater tendency to form complexes.
Behaviour similar to lanthanoids is not evident until the second half of the actinoid series.`,

  '2023S-11': r`The transition metals (with the exception of Zn, Cd and Hg) are very hard and have low volatility. Their melting and boiling points are high.
The high melting points of these metals are attributed to the involvement of a greater number of electrons from (n−1)d in addition to the ns electrons in the interatomic metallic bonding. Because of the large number of unpaired electrons, there is strong interatomic interaction (strong metallic bonding).
In any row the melting points rise to a maximum at $d^5$ (except for anomalous values of Mn and Tc) and fall regularly as the atomic number increases, which indicates that one unpaired electron per d orbital is particularly favourable for strong interatomic interaction.`,

  '2023S-17': r`General chemical reactions of the lanthanoids (Ln):
(1) Burn in oxygen to form oxides:
$\ce{4Ln + 3O2 -> 2Ln2O3}$
(2) Burn in halogens to form halides:
$\ce{2Ln + 3X2 -> 2LnX3}$
(3) Liberate hydrogen from dilute acids:
$\ce{2Ln + 6H^+ -> 2Ln^{3+} + 3H2}$
(4) React with water to form hydroxide and hydrogen:
$\ce{2Ln + 6H2O -> 2Ln(OH)3 + 3H2}$
(5) Heated with nitrogen to form nitride:
$\ce{2Ln + N2 ->[\Delta] 2LnN}$
(6) Heated with sulphur to form sulphide:
$\ce{2Ln + 3S ->[\Delta] Ln2S3}$
(7) Heated with carbon at 2773 K to form carbides $\ce{LnC2}$, $\ce{Ln2C3}$, $\ce{Ln3C}$:
$\ce{Ln + 2C ->[2773 K] LnC2}$
(8) Combine with hydrogen when gently heated in the gas.
The hydroxides $\ce{Ln(OH)3}$ are definite compounds and are basic like alkaline earth metal hydroxides.`,

  '2022M-8': K2CR2O7_PREP,
  '2020M-18': K2CR2O7_PREP,
  '2026M-16': CHEM_2024_MAIN['16'],

  '2022M-12': r`$\ce{Mn^{2+}}$ = $[\ce{Ar}]\,3d^5$. It has the half-filled $d^5$ configuration, which is particularly stable. Oxidation to $\ce{Mn^{3+}}$ ($d^4$) would destroy this stable configuration; the third ionisation enthalpy of Mn (change $d^5 \to d^4$) is very large. So $\ce{Mn^{2+}}$ compounds are stable towards oxidation.

$\ce{Fe^{2+}}$ = $[\ce{Ar}]\,3d^6$. On oxidation it becomes $\ce{Fe^{3+}}$, $3d^5$, which is the extra stable half-filled configuration. So $\ce{Fe^{2+}}$ is easily oxidised to $\ce{Fe^{3+}}$.
($E^\circ$: $\ce{Mn^{3+}/Mn^{2+}}$ = +1.57 V; $\ce{Fe^{3+}/Fe^{2+}}$ = +0.77 V)`,

  '2022S-10': r`Uses of d- and f-block elements (any four):
(1) Iron and steels are the most important construction materials; alloying metals such as Cr, Mn and Ni are added.
(2) $\ce{TiO}$ is used in the pigment industry and $\ce{MnO2}$ in dry battery cells; the battery industry also requires Zn and Ni/Cd.
(3) Group 11 elements (Cu, Ag, Au) are called coinage metals.
(4) Catalysts: $\ce{V2O5}$ in manufacture of sulphuric acid; $\ce{TiCl4}$ with $\ce{Al(CH3)3}$ (Ziegler catalyst) for polythene; iron in Haber process; nickel in hydrogenation of fats; $\ce{PdCl2}$ in Wacker process.
(5) AgBr is used in the photographic industry.
(6) Lanthanoids: mischmetall (in Mg-based alloy for bullets, shell and lighter flint); mixed oxides of lanthanoids as catalysts in petroleum cracking; Ln oxides as phosphors in television screens.`,

  '2022S-18': KMNO4_PREP + r`

Properties (any two):
(1) It forms dark purple (almost black) crystals, isostructural with $\ce{KClO4}$; not very soluble in water.
(2) On heating at 513 K it decomposes:
$\ce{2KMnO4 -> K2MnO4 + MnO2 + O2}$
(3) Intense colour and diamagnetism; permanganate ion is tetrahedral.
(4) Strong oxidising agent in acid solution, e.g. converts $\ce{Fe^{2+}}$ to $\ce{Fe^{3+}}$:
${FE2}`,

  '2021M-5': r`Atomic number 26: Fe = $[\ce{Ar}]\,3d^6 4s^2$
Trivalent ion $\ce{Fe^{3+}}$ = $[\ce{Ar}]\,3d^5$
Number of unpaired electrons, $n = 5$
$\mu = \sqrt{n(n+2)}$
$= \sqrt{5 \times 7} = \sqrt{35}$
$\mu = 5.92$ BM`,

  '2021M-15': KMNO4_PREP + r`

Acidified permanganate oxidises oxalic acid (oxalate) to carbon dioxide at 333 K:
Reduction: $\ce{MnO4^- + 8H^+ + 5e^- -> Mn^{2+} + 4H2O}$ ×2
Oxidation: $\ce{C2O4^{2-} -> 2CO2 + 2e^-}$ ×5
Ionic equation:
${OXALATE}`,

  '2020M-2': LN_CONTRACTION,

  '2020M-10': r`Manganese (Mn, $3d^5 4s^2$) exhibits the largest number of oxidation states, from +2 to +7.
The elements which give the greatest number of oxidation states occur in or near the middle of the series. Mn has the maximum number of unpaired electrons (five 3d + two 4s electrons) available to lose or share. At the ends of the series there are either too few electrons to lose or share (Sc, Ti) or too many d electrons, hence fewer orbitals available for sharing (Cu, Zn).`,

  '2026M-7': r`Colour arises from d–d transition, which needs partly filled d orbitals. Ions with $d^0$ or $d^{10}$ are colourless.
$\ce{Ti^{3+}}$: $3d^1$, one unpaired electron → coloured (purple)
$\ce{V^{3+}}$: $3d^2$, two unpaired electrons → coloured (green)
$\ce{Cu^+}$: $3d^{10}$, no unpaired electron → colourless
$\ce{Sc^{3+}}$: $3d^0$, no d electron → colourless
$\ce{Mn^{2+}}$: $3d^5$, five unpaired electrons → coloured (pink)
$\ce{Fe^{3+}}$: $3d^5$, five unpaired electrons → coloured (yellow)
$\ce{Co^{2+}}$: $3d^7$, three unpaired electrons → coloured (pink)
So $\ce{Ti^{3+}}$, $\ce{V^{3+}}$, $\ce{Mn^{2+}}$, $\ce{Fe^{3+}}$ and $\ce{Co^{2+}}$ are coloured; $\ce{Cu^+}$ and $\ce{Sc^{3+}}$ are colourless.`,
}
