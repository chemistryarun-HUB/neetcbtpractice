// Ch 9 Amines. NCERT wording (lech204, Rationalised 2023-24).
import { AFTER as CHEM_2024_MAIN } from '../chem-2024-wrap.mjs'
const r = String.raw
const P = r`\mathit{p}\text{-}`
const LOWT = r`->[\text{273–278 K}]`

const CARBYLAMINE = r`Carbylamine reaction (isocyanide test): aliphatic and aromatic primary amines on heating with chloroform and ethanolic potassium hydroxide form isocyanides (carbylamines), which are foul smelling substances. Secondary and tertiary amines do not show this reaction. It is used as a test for primary amines.
$\ce{R-NH2 + CHCl3 + 3KOH}$
$\ce{->[\Delta] R-NC + 3KCl + 3H2O}$
e.g. $\ce{C6H5NH2 + CHCl3 + 3KOH}$
$\ce{->[\Delta] C6H5NC + 3KCl + 3H2O}$
(aniline → phenyl isocyanide)`

const HOFFMANN = r`Hoffmann bromamide degradation: a primary amine is prepared by treating an amide with bromine in an aqueous or ethanolic solution of sodium hydroxide. In this degradation reaction, migration of an alkyl or aryl group takes place from the carbonyl carbon of the amide to the nitrogen atom. The amine so formed contains one carbon less than that present in the amide.
$\ce{R-CONH2 + Br2 + 4NaOH}$
$\ce{-> R-NH2 + Na2CO3}$
$+ \ce{2NaBr + 2H2O}$
e.g. $\ce{CH3CONH2 -> CH3NH2}$ (ethanamide → methanamine)`

const DIAZO = r`$\ce{C6H5NH2 + NaNO2 + 2HCl}$
$\ce{${LOWT} C6H5N2^+Cl^- + NaCl + 2H2O}$`

const ACYL = r`$\ce{C6H5NH2 + (CH3CO)2O}$
$\ce{->[pyridine] C6H5NHCOCH3 + CH3COOH}$`

const COUPLING = r`(1) Orange dye: benzenediazonium chloride reacts with phenol (alkaline medium); the phenol molecule at its para position is coupled with the diazonium salt to form p-hydroxyazobenzene:
$\ce{C6H5N2^+Cl^- + C6H5OH ->[OH^-]}$
$\ce{C6H5-N=N-C6H4OH + HCl}$
(p-hydroxyazobenzene, orange dye)
(2) Yellow dye: diazonium salt with aniline (acidic medium) yields p-aminoazobenzene:
$\ce{C6H5N2^+Cl^- + C6H5NH2 ->[H^+]}$
$\ce{C6H5-N=N-C6H4NH2 + HCl}$
(p-aminoazobenzene, yellow dye)`

const BROMOANILINE = r`Aniline with bromine water gives 2,4,6-tribromoaniline, as $\ce{-NH2}$ is a powerful activating group. To get the monosubstituted product the $\ce{-NH2}$ group is protected by acetylation, which reduces its activating effect (the lone pair on N also interacts with the C=O by resonance).
Step 1: Acetylation:
${ACYL}
Step 2: Bromination (para product is major):
$\ce{C6H5NHCOCH3 ->[Br2/CH3COOH]}$
$\ce{${P}BrC6H4NHCOCH3}$
(4-bromoacetanilide)
Step 3: Hydrolysis:
$\ce{${P}BrC6H4NHCOCH3 ->[H^+ or OH^-][H2O]}$
$\ce{${P}BrC6H4NH2 + CH3COOH}$
(4-bromoaniline)`

const ACYLATION = r`Acylation: aliphatic and aromatic primary and secondary amines react with acid chlorides, anhydrides and esters by nucleophilic substitution. This reaction is known as acylation; the hydrogen atom of $\ce{-NH2}$ or >N–H group is replaced by the acyl group. The products are amides. The reaction is carried out in the presence of a base stronger than the amine, like pyridine, which removes the HCl formed and shifts the equilibrium to the right.
$\ce{C2H5NH2 + CH3COCl}$
$\ce{->[pyridine] C2H5NHCOCH3 + HCl}$
(N-ethylethanamide)
$\ce{(C2H5)2NH + CH3COCl}$
$\ce{->[pyridine] (C2H5)2NCOCH3 + HCl}$
${ACYL}
(acetanilide, N-phenylethanamide)
Amines also react with benzoyl chloride (benzoylation):
$\ce{CH3NH2 + C6H5COCl}$
$\ce{-> CH3NHCOC6H5 + HCl}$`

const BASIC_PNA = r`p-Nitroaniline < Aniline < p-Toluidine
(the electron releasing $\ce{-CH3}$ increases, and the electron withdrawing $\ce{-NO2}$ decreases, the availability of the lone pair on N)`

export const ANSWERS = {
  '2025M-20': BROMOANILINE,
  '2022S-17': BROMOANILINE,

  '2025M-21': r`Hinsberg test: benzenesulphonyl chloride ($\ce{C6H5SO2Cl}$, Hinsberg's reagent) reacts with primary and secondary amines to form sulphonamides.
(a) Primary amine gives N-ethylbenzenesulphonamide:
$\ce{C6H5SO2Cl + H2N-C2H5}$
$\ce{-> C6H5SO2NHC2H5 + HCl}$
The hydrogen attached to nitrogen in this sulphonamide is strongly acidic due to the strong electron withdrawing sulphonyl group, so it is soluble in alkali.
(b) Secondary amine gives N,N-diethylbenzenesulphonamide:
$\ce{C6H5SO2Cl + HN(C2H5)2}$
$\ce{-> C6H5SO2N(C2H5)2 + HCl}$
It has no H on nitrogen, so it is not acidic and is insoluble in alkali.
(c) Tertiary amines do not react with benzenesulphonyl chloride.`,

  '2025S-20': r`$\ce{C6H5CH2Cl ->[X] C6H5CH2NO2}$: haloalkanes react with silver nitrite to form nitroalkanes.
X = $\ce{AgNO2}$
$\ce{C6H5CH2Cl + AgNO2}$
$\ce{-> C6H5CH2NO2 + AgCl}$
Reduction of the nitro compound with Sn + HCl gives the primary amine:
Y = $\ce{C6H5CH2NH2}$ (phenylmethanamine, benzylamine)
$\ce{C6H5CH2NO2 + 6[H]}$
$\ce{->[Sn/HCl] C6H5CH2NH2 + 2H2O}$
A primary amine gives an isocyanide by the carbylamine reaction:
Z = $\ce{CHCl3}$ + alcoholic KOH
$\ce{C6H5CH2NH2 + CHCl3 + 3KOH}$
$\ce{->[\Delta] C6H5CH2NC + 3KCl + 3H2O}$`,

  '2025S-21': r`(1) Basic strength: ${BASIC_PNA}
(2) Boiling point: $\ce{(CH3)2NH}$ < $\ce{C2H5NH2}$ < $\ce{C2H5OH}$
(The secondary amine has only one N–H for hydrogen bonding; O–H hydrogen bonds are stronger than N–H, as O is more electronegative.)
(3) Solubility in water: $\ce{C6H5NH2}$ < $\ce{(C2H5)2NH}$ < $\ce{C2H5NH2}$
(Solubility decreases with increase in the size of the hydrophobic alkyl/aryl part.)`,

  '2024S-21': r`(i) Carbylamine reaction:
$\ce{C6H5NH2 + CHCl3 + 3KOH(alc)}$
$\ce{->[\Delta] C6H5NC + 3KCl + 3H2O}$
(ii) Diazotisation:
${DIAZO}
(iii) Acylation:
${ACYL}`,

  '2023M-6': COUPLING,

  '2023M-16': HOFFMANN,
  '2021M-9': HOFFMANN,

  '2023M-17': ACYLATION,

  '2023S-4': CARBYLAMINE,
  '2020M-12': CARBYLAMINE,

  '2023S-5': CHEM_2024_MAIN['20'],

  '2023S-18': r`Direct nitration of aniline yields tarry oxidation products in addition to the nitro derivatives. Moreover, in the strongly acidic medium, aniline is protonated to form the anilinium ion, which is meta directing. That is why besides the ortho and para derivatives, a significant amount of meta derivative is also formed:
$\ce{C6H5NH2 ->[HNO3/H2SO4][288 K]}$
p-nitroaniline (51%) + m-nitroaniline (47%) + o-nitroaniline (2%)
By protecting the $\ce{-NH2}$ group by acetylation with acetic anhydride, the nitration reaction can be controlled and the p-nitro derivative is obtained as the major product:
${ACYL}
$\ce{C6H5NHCOCH3 ->[HNO3/H2SO4][288 K]}$
$\ce{${P}O2NC6H4NHCOCH3}$
$\ce{->[OH^- or H^+][H2O] ${P}O2NC6H4NH2}$
(p-nitroaniline)`,

  '2022M-7': r`Gabriel phthalimide synthesis is used for the preparation of aliphatic primary amines. In it the potassium salt of phthalimide reacts with an alkyl halide by nucleophilic substitution.
Aromatic primary amines cannot be prepared by this method because aryl halides do not undergo nucleophilic substitution with the anion formed by phthalimide. (The C–X bond of aryl halides has partial double bond character due to resonance, and the phenyl cation is unstable.)`,

  '2022M-19': r`Step 1: Reduction of nitrobenzene to aniline:
$\ce{C6H5NO2 ->[Sn/HCl] C6H5NH2}$
Step 2: Diazotisation:
${DIAZO}
Step 3: Sandmeyer reaction (CuCl/HCl):
$\ce{C6H5N2^+Cl^- ->[Cu2Cl2/HCl] C6H5Cl + N2}$
(chlorobenzene)`,

  '2022M-20': r`Step 1: Aniline with bromine water at room temperature gives a white precipitate of 2,4,6-tribromoaniline:
$\ce{C6H5NH2 + 3Br2 ->[Br2/H2O]}$
$\ce{C6H2Br3NH2 + 3HBr}$
Step 2: Diazotisation:
$\ce{C6H2Br3NH2 ->[NaNO2 + HCl][\text{273–278 K}]}$
$\ce{C6H2Br3N2^+Cl^-}$
Step 3: Hypophosphorous acid (phosphinic acid) reduces the diazonium salt (replacement of $\ce{-N2^+}$ by H):
$\ce{C6H2Br3N2^+Cl^- + H3PO2 + H2O}$
$\ce{-> C6H3Br3 + N2 + H3PO3 + HCl}$
(1,3,5-tribromobenzene)`,

  '2022S-6': r`(i) $\ce{CH3-CH(CH3)-N(CH3)-CH3}$: N,N-dimethylpropan-2-amine
(ii) $\ce{CH3-CH2-NHCOCH3}$: N-ethylethanamide`,

  '2022S-16': r`Methanamine to ethanamine (one carbon is added through cyanide):
$\ce{CH3NH2 ->[NaNO2 + HCl] CH3OH}$
$\ce{->[PBr3] CH3Br}$
$\ce{->[KCN] CH3CN}$
$\ce{->[LiAlH4 or H2/Ni] CH3CH2NH2}$
Equations:
$\ce{CH3NH2 + HNO2 -> CH3OH + N2 + H2O}$
$\ce{3CH3OH + PBr3 -> 3CH3Br + H3PO3}$
$\ce{CH3Br + KCN -> CH3CN + KBr}$
$\ce{CH3CN + 4[H] -> CH3CH2NH2}$`,

  '2021M-19': r`(i) $\ce{C6H5NH2}$ < $\ce{C6H5N(CH3)2}$ < $\ce{(C2H5)2NH}$
(ii) ${BASIC_PNA}
(iii) $\ce{C6H5NH2}$ < $\ce{C6H5NHCH3}$ < $\ce{C6H5CH2NH2}$
(In aryl amines the lone pair on N is delocalised into the ring, so they are weaker bases than aliphatic amines; in benzylamine N is not attached to the ring.)`,

  '2021M-21': r`Direct nitration gives tarry products and m-isomer, so the $\ce{-NH2}$ group is first protected by acetylation.
Step 1: Acetylation:
${ACYL}
Step 2: Nitration (para product major):
$\ce{C6H5NHCOCH3 ->[HNO3/H2SO4][288 K]}$
$\ce{${P}O2NC6H4NHCOCH3}$
Step 3: Hydrolysis:
$\ce{${P}O2NC6H4NHCOCH3 ->[OH^- or H^+][H2O]}$
$\ce{${P}O2NC6H4NH2 + CH3COOH}$
(p-nitroaniline)`,

  '2021M-26': r`(i) $\ce{CH3CH2Br ->[KCN] CH3CH2CN}$
A = $\ce{CH3CH2CN}$ (propanenitrile)
$\ce{CH3CH2CN ->[(i) DIBAL-H][(ii) H2O] CH3CH2CHO}$
B = $\ce{CH3CH2CHO}$ (propanal)
(ii) $\ce{C6H5NO2 ->[Fe/HCl] C6H5NH2}$
A = $\ce{C6H5NH2}$ (aniline)
$\ce{C6H5NH2 + (CH3CO)2O ->[pyridine]}$
$\ce{C6H5NHCOCH3 + CH3COOH}$
B = $\ce{C6H5NHCOCH3}$ (acetanilide, N-phenylethanamide)`,

  '2020M-6': r`Aniline reacts with nitrous acid ($\ce{NaNO2 + HCl}$) at low temperature to form benzenediazonium chloride:
${DIAZO}
Ethanamine (primary aliphatic amine) forms an unstable diazonium salt, which gives ethanol with evolution of nitrogen:
$\ce{C2H5NH2 + HNO2 ->[NaNO2 + HCl]}$
$\ce{[C2H5N2^+Cl^-] ->[H2O] C2H5OH + N2 ^ + HCl}$`,

  '2020M-16': r`(i) The amine has one carbon less than the amide. Propanamine ($\ce{CH3CH2CH2NH2}$) comes from butanamide:
$\ce{CH3CH2CH2CONH2}$ (butanamide)
$\ce{CH3CH2CH2CONH2 ->[Br2 + 4NaOH]}$
$\ce{CH3CH2CH2NH2}$ (propan-1-amine)
(ii) Benzamide gives aniline:
$\ce{C6H5CONH2 + Br2 + 4NaOH}$
$\ce{-> C6H5NH2 + Na2CO3 + 2NaBr + 2H2O}$
$\ce{C6H5NH2}$: benzenamine (aniline)`,

  '2020M-17': r`(i) Benzene into aniline:
$\ce{C6H6 ->[\text{conc.}~HNO3/\text{conc.}~H2SO4] C6H5NO2}$
$\ce{->[Sn/HCl or Fe/HCl] C6H5NH2}$
(ii) Benzene into N,N-dimethylaniline: aniline (from (i)) is alkylated with excess methyl iodide (or chloride):
$\ce{C6H5NH2 + 2CH3I}$
$\ce{-> C6H5N(CH3)2 + 2HI}$
(iii) $\ce{Cl-(CH2)4-Cl}$ into hexane-1,6-diamine (two carbons added through cyanide, then reduction):
$\ce{Cl(CH2)4Cl + 2KCN}$
$\ce{->[ethanol] NC(CH2)4CN + 2KCl}$
$\ce{NC(CH2)4CN ->[LiAlH4 or H2/Ni]}$
$\ce{H2N(CH2)6NH2}$`,

  '2026M-20': r`In 4-nitrotoluene, $\ce{-CH3}$ (o,p-directing) and $\ce{-NO2}$ (m-directing) both direct Br to C-2.
Step 1: Bromination:
4-nitrotoluene $\ce{->[Br2/FeBr3]}$ 2-bromo-4-nitrotoluene
Step 2: Reduction of $\ce{-NO2}$ to $\ce{-NH2}$ (Sn/HCl):
→ 3-bromo-4-methylaniline
Step 3: Diazotisation ($\ce{NaNO2 + HCl}$, 273–278 K), then removal of $\ce{-N2^+Cl^-}$ with $\ce{H3PO2}$:
→ 2-bromotoluene
Step 4: Oxidation of the side chain with $\ce{KMnO4}$/KOH, then $\ce{H3O^+}$:
→ 2-bromobenzoic acid
$\ce{BrC6H4CH3 ->[KMnO4/KOH,~\Delta][H3O^+] BrC6H4COOH}$`,

  '2026M-21': r`(i) Carbylamine reaction:
$\ce{C6H5NH2 + CHCl3 + 3KOH}$
$\ce{->[\Delta] C6H5NC + 3KCl + 3H2O}$
(ii) Hoffmann's bromamide reaction:
$\ce{CH3CONH2 + Br2 + 4NaOH}$
$\ce{-> CH3NH2 + Na2CO3 + 2NaBr + 2H2O}$
(iii) Coupling reaction:
$\ce{C6H5N2^+Cl^- + C6H5OH ->[OH^-]}$
$\ce{C6H5-N=N-C6H4OH + HCl}$
(p-hydroxyazobenzene, orange dye)`,
}
