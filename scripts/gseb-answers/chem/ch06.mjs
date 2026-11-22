// Ch 6 Haloalkanes and Haloarenes. NCERT wording (lech201, Rationalised 2023-24).
const r = String.raw

const ETHANOL_EtF = r`Step 1: Ethanol to ethyl chloride (thionyl chloride gives pure alkyl halide, as $\ce{SO2}$ and $\ce{HCl}$ escape as gases):
$\ce{C2H5OH + SOCl2}$
$\ce{-> C2H5Cl + SO2 ^ + HCl ^}$
Step 2: Ethyl chloride to ethyl fluoride by Swarts reaction (heating with a metallic fluoride such as AgF, $\ce{Hg2F2}$, $\ce{CoF2}$ or $\ce{SbF3}$):
$\ce{C2H5Cl + AgF ->[\Delta] C2H5F + AgCl}$`

const BUT1_BUT2 = r`Step 1: Addition of HBr to but-1-ene (Markovnikov's rule) gives 2-bromobutane:
$\ce{CH3CH2CH=CH2 + HBr}$
$\ce{-> CH3CH2CH(Br)CH3}$
Step 2: Dehydrohalogenation with alcoholic KOH (β-elimination). By Zaitsev rule the more substituted alkene, but-2-ene, is the major product:
$\ce{CH3CH2CH(Br)CH3 + KOH(alc)}$
$\ce{->[\Delta] CH3CH=CHCH3 + KBr + H2O}$`

const IODOBUTANE = r`(i) From butan-1-ol: good yields of R–I are obtained by heating alcohols with sodium or potassium iodide in 95% orthophosphoric acid:
$\ce{CH3CH2CH2CH2OH + KI + H3PO4}$
$\ce{->[\Delta] CH3CH2CH2CH2I + KH2PO4 + H2O}$

(ii) From 1-chlorobutane (Finkelstein reaction, NaI in dry acetone; NaCl precipitates and drives the reaction forward):
$\ce{CH3CH2CH2CH2Cl + NaI}$
$\ce{->[dry~acetone] CH3CH2CH2CH2I + NaCl v}$

(iii) From but-1-ene: addition of HBr in presence of peroxide (anti-Markovnikov) gives 1-bromobutane, which by Finkelstein reaction gives 1-iodobutane:
$\ce{CH3CH2CH=CH2 + HBr}$
$\ce{->[peroxide] CH3CH2CH2CH2Br}$
$\ce{CH3CH2CH2CH2Br + NaI}$
$\ce{->[dry~acetone] CH3CH2CH2CH2I + NaBr}$`

const SWARTS = r`Swarts reaction: the synthesis of alkyl fluorides is best accomplished by heating an alkyl chloride/bromide in the presence of a metallic fluoride such as AgF, $\ce{Hg2F2}$, $\ce{CoF2}$ or $\ce{SbF3}$.
Example:
$\ce{CH3Br + AgF ->[\Delta] CH3F + AgBr}$
$\ce{2CH3CH2Cl + Hg2F2}$
$\ce{->[\Delta] 2CH3CH2F + Hg2Cl2}$`

const BETA_ELIM = r`When a haloalkane with a β-hydrogen atom is heated with alcoholic solution of potassium hydroxide, there is elimination of a hydrogen atom from the β-carbon and a halogen atom from the α-carbon atom. As a result, an alkene is formed. Since a β-hydrogen atom is involved in elimination, it is often called β-elimination (dehydrohalogenation).
(The carbon on which the halogen is attached is the α-carbon; the carbon adjacent to it is the β-carbon.)
Example:
$\ce{CH3CH2Br + KOH(alc)}$
$\ce{->[\Delta] CH2=CH2 + KBr + H2O}$

Zaitsev (Saytzeff) rule: if more than one alkene can form, "the preferred product is that alkene which has the greater number of alkyl groups attached to the doubly bonded carbon atoms".
2-Bromopentane with alc. KOH gives:
$\ce{CH3CH=CHCH2CH3}$ pent-2-ene (major, 81%)
$\ce{CH2=CHCH2CH2CH3}$ pent-1-ene (minor, 19%)`

export const ANSWERS = {
  '2025M-7': ETHANOL_EtF,
  '2021M-4': ETHANOL_EtF,

  '2025M-8': r`$\ce{C5H10}$ (general formula $\ce{C_nH_{2n}}$) does not react with chlorine in the dark, so it has no C=C double bond; it must be a cycloalkane.
It gives a single monochloro compound $\ce{C5H9Cl}$ in bright sunlight (free radical substitution), so all ten hydrogen atoms are equivalent. The hydrocarbon is cyclopentane.
$\ce{C5H10 + Cl2 ->[h\nu] C5H9Cl + HCl}$
(cyclopentane → chlorocyclopentane)`,

  '2025M-17': IODOBUTANE,
  '2023M-15': IODOBUTANE,
  '2021M-17': IODOBUTANE,

  '2025S-7': BUT1_BUT2,
  '2020M-5': BUT1_BUT2,

  '2025S-8': r`Boiling points of isomeric dihalobenzenes are very nearly the same. However, the para-isomers are high melting as compared to their ortho- and meta-isomers.
It is due to the symmetry of the para-isomer, which fits in the crystal lattice better as compared to the ortho- and meta-isomers. So more energy is needed to break the lattice of p-dichlorobenzene.
(m.p.: p-dichlorobenzene 323 K; o-isomer 256 K; m-isomer 249 K)`,

  '2025S-18': r`The reaction between $\ce{CH3Cl}$ and hydroxide ion to yield methanol and chloride ion follows second order kinetics, i.e. the rate depends upon the concentration of both reactants:
Rate $= k[\ce{CH3Cl}][\ce{OH^-}]$
It is a bimolecular nucleophilic substitution ($S_N2$) reaction.
$\ce{HO^- + CH3-Cl}$
$\to [\mathrm{HO}\cdots\mathrm{CH_3}\cdots\mathrm{Cl}]^{-}$ (transition state)
$\ce{-> HO-CH3 + Cl^-}$
Mechanism: the incoming nucleophile ($\ce{OH^-}$) attacks the carbon from the side opposite to the halogen. Bond formation (C–O) and bond breaking (C–Cl) take place simultaneously in a single step and no intermediate is formed. In the transition state all three C–H bonds are in the same plane and the attacking and leaving groups are partially attached to the carbon. As the nucleophile attaches and the chloride leaves, the configuration is inverted (like an umbrella turning inside out).`,

  '2024S-7': r`Step 1: Hydrolysis with aqueous KOH gives benzyl alcohol:
$\ce{C6H5CH2Cl + KOH(aq)}$
$\ce{-> C6H5CH2OH + KCl}$
Step 2: Benzyl alcohol with phosphorus tribromide (red P + $\ce{Br2}$) gives benzyl bromide:
$\ce{3C6H5CH2OH + PBr3}$
$\ce{-> 3C6H5CH2Br + H3PO3}$`,

  '2024S-8': r`(i) With aqueous KOH (nucleophilic substitution), ethanol is formed:
$\ce{C2H5Cl + KOH(aq) -> C2H5OH + KCl}$
(ii) With alcoholic KOH (β-elimination), ethene is formed:
$\ce{C2H5Cl + KOH(alc)}$
$\ce{->[\Delta] CH2=CH2 + KCl + H2O}$`,

  '2024S-17': r`Chlorine withdraws electrons through inductive effect (−I) and releases electrons through resonance (+R).
Through inductive effect, chlorine destabilises the intermediate carbocation formed during the electrophilic substitution, so the ring is somewhat deactivated compared to benzene.
Through resonance, the lone pairs on chlorine are delocalised into the ring and the electron density increases more at ortho- and para-positions than at meta-positions. Halogen thus tends to stabilise the carbocation, and the effect is more pronounced for attack at ortho- and para-positions.
The inductive effect is stronger than resonance and causes net electron withdrawal (net deactivation). The resonance effect opposes the inductive effect for attack at ortho- and para-positions and makes the deactivation less there.
So reactivity is controlled by the stronger inductive effect and orientation is controlled by resonance effect: chlorine is deactivating yet o,p-directing.`,

  '2023M-5': r`(i) Propene: heating with alcoholic KOH (dehydrohalogenation):
$\ce{CH3CH2CH2Cl + KOH(alc)}$
$\ce{->[\Delta] CH3CH=CH2 + KCl + H2O}$
(ii) Propan-1-ol: hydrolysis with aqueous KOH:
$\ce{CH3CH2CH2Cl + KOH(aq)}$
$\ce{-> CH3CH2CH2OH + KCl}$`,

  '2023S-3': SWARTS,
  '2026M-2': SWARTS + r`

Finkelstein reaction: alkyl iodides are prepared by the reaction of alkyl chlorides/bromides with NaI in dry acetone. NaCl or NaBr formed is precipitated in dry acetone, which drives the forward reaction (Le Chatelier's principle).
$\ce{C2H5Br + NaI}$
$\ce{->[dry~acetone] C2H5I + NaBr v}$`,

  '2023S-9': r`Step 1: Bromination of benzene in presence of Lewis acid catalyst ($\ce{FeBr3}$):
$\ce{C6H6 + Br2 ->[FeBr3] C6H5Br + HBr}$
Step 2: Nitration of bromobenzene with conc. $\ce{HNO3}$ + conc. $\ce{H2SO4}$. Br is o,p-directing, so the para product (4-bromonitrobenzene) is major and is separated from the ortho isomer:
$\ce{C6H5Br + HNO3}$
$\ce{->[\text{conc.}~H2SO4] BrC6H4NO2 + H2O}$
(4-bromonitrobenzene, major, along with some 2-bromonitrobenzene)`,

  '2023S-13': BETA_ELIM,
  '2022S-15': BETA_ELIM,

  '2022M-6': r`Wurtz reaction: alkyl halides react with sodium in dry ether to give hydrocarbons containing double the number of carbon atoms present in the halide.
$\ce{2CH3CH2CH2CH2Cl + 2Na}$
$\ce{->[dry~ether] CH3(CH2)6CH3 + 2NaCl}$
(1-chlorobutane → n-octane)`,

  '2022M-13': r`Reactivity in $S_N2$ decreases as steric hindrance near the carbon bearing the halogen increases (1° > 2° > 3°; branching near the reaction centre slows it).
(i) 1-Bromopentane > 2-Bromopentane > 2-Bromo-2-methylbutane
(ii) 1-Bromo-3-methylbutane > 2-Bromo-3-methylbutane > 2-Bromo-2-methylbutane
(iii) 1-Bromobutane > 1-Bromo-3-methylbutane > 1-Bromo-2-methylbutane > 1-Bromo-2,2-dimethylpropane
(In (iii) all are 1°; the nearer the branching to the C–Br carbon, the slower the reaction.)`,

  '2022S-5': r`Step 1: Addition of HBr to ethene gives bromoethane:
$\ce{CH2=CH2 + HBr -> CH3CH2Br}$
Step 2: Wurtz reaction (sodium in dry ether):
$\ce{2CH3CH2Br + 2Na}$
$\ce{->[dry~ether] CH3CH2CH2CH3 + 2NaBr}$
(ethene → butane)`,

  '2020M-15': r`The hydroxyl group of an alcohol is replaced by halogen on reaction with concentrated halogen acids, phosphorus halides or thionyl chloride.
(1) With HCl and anhydrous $\ce{ZnCl2}$; by-product water:
$\ce{R-OH + HCl ->[ZnCl2] R-Cl + H2O}$
(2) With phosphorus halides; by-products $\ce{H3PO3}$, or $\ce{POCl3}$ and HCl:
$\ce{3R-OH + PCl3 -> 3R-Cl + H3PO3}$
$\ce{R-OH + PCl5 -> R-Cl + POCl3 + HCl}$
(3) With thionyl chloride; by-products $\ce{SO2}$ and HCl are gases and escape, so pure alkyl halide is obtained (preferred method):
$\ce{R-OH + SOCl2}$
$\ce{-> R-Cl + SO2 ^ + HCl ^}$`,

  '2026M-9': r`Boiling point increases with molecular mass (more halogen atoms, heavier halogen, larger alkyl group) and decreases with branching.
(i) Chloromethane < Bromomethane < Dibromomethane < Bromoform
(ii) Isopropyl chloride < 1-Chloropropane < 1-Chlorobutane
(Isopropyl chloride is branched, so it has a lower boiling point than 1-chloropropane.)`,
}
