// Ch 8 Aldehydes, Ketones and Carboxylic Acids. NCERT wording (lech203, Rationalised 2023-24).
const r = String.raw
const P = r`\mathit{p}\text{-}`
const O = r`\mathit{o}\text{-}`
const M = r`\mathit{m}\text{-}`

const CANNIZZARO = r`Cannizzaro reaction: aldehydes which do not have an α-hydrogen atom undergo self oxidation and reduction (disproportionation) on heating with concentrated alkali. One molecule is reduced to alcohol while another is oxidised to the carboxylic acid salt.
$\ce{2HCHO + \text{conc.}~KOH}$
$\ce{->[\Delta] CH3OH + HCOOK}$
$\ce{2C6H5CHO + \text{conc.}~NaOH}$
$\ce{->[\Delta] C6H5CH2OH + C6H5COONa}$`

const PROPANAL_PROPANONE = r`(1) Tollens' test: propanal, being an aldehyde, gives a bright silver mirror on warming with Tollens' reagent (ammoniacal silver nitrate). Propanone does not.
$\ce{CH3CH2CHO + 2[Ag(NH3)2]^+ + 3OH^-}$
$\ce{-> CH3CH2COO^- + 2Ag v}$
$+ \ce{2H2O + 4NH3}$
(2) Iodoform test: propanone, a methyl ketone, gives a yellow precipitate of iodoform on heating with $\ce{I2}$ and NaOH (sodium hypoiodite). Propanal does not (it has no $\ce{CH3CO}$– group).
$\ce{CH3COCH3 + 3NaOI}$
$\ce{-> CH3COONa + CHI3 v + 2NaOH}$`

const TOLLENS = r`Tollens' test: on warming an aldehyde with freshly prepared ammoniacal silver nitrate solution (Tollens' reagent), a bright silver mirror is produced due to the formation of silver metal. The aldehyde is oxidised to the corresponding carboxylate anion. The reaction occurs in alkaline medium.
$\ce{RCHO + 2[Ag(NH3)2]^+ + 3OH^-}$
$\ce{-> RCOO^- + 2Ag v + 2H2O + 4NH3}$
Ketones do not give this test.`

const ALDOL_ETHANAL = r`Aldol condensation: aldehydes and ketones having at least one α-hydrogen undergo a reaction in the presence of dilute alkali as catalyst to form β-hydroxy aldehydes (aldol) or β-hydroxy ketones (ketol). The aldol and ketol readily lose water to give α,β-unsaturated carbonyl compounds, which are aldol condensation products.
$\ce{2CH3CHO}$
$\ce{<=>[\text{dil.}~NaOH] CH3-CH(OH)-CH2-CHO}$
(ethanal → 3-hydroxybutanal, aldol)
$\ce{CH3-CH(OH)-CH2-CHO}$
$\ce{->[\Delta][-H2O] CH3-CH=CH-CHO}$
(but-2-enal)`

const ETHYLBENZALDEHYDE = r`(1) It forms a 2,4-DNP derivative, so it is an aldehyde or a ketone.
(2) It reduces Tollens' reagent, so it is an aldehyde.
(3) It undergoes Cannizzaro reaction, so the CHO group has no α-hydrogen (CHO is attached to the benzene ring).
(4) On vigorous oxidation it gives 1,2-benzenedicarboxylic acid (phthalic acid), so it has two side chains in ortho positions.
$\ce{C9H10O}$ = $\ce{C6H4}$ + CHO + $\ce{C2H5}$. The compound is 2-ethylbenzaldehyde, $\ce{${O}C2H5C6H4CHO}$.
Reactions:
(i) With 2,4-DNP it forms 2-ethylbenzaldehyde 2,4-dinitrophenylhydrazone:
$\ce{ArCHO + H2NNHC6H3(NO2)2}$
$\ce{-> ArCH=NNHC6H3(NO2)2 + H2O}$
(ii) Tollens' test:
$\ce{ArCHO + 2[Ag(NH3)2]^+ + 3OH^-}$
$\ce{-> ArCOO^- + 2Ag v + 2H2O + 4NH3}$
(iii) Cannizzaro reaction:
$\ce{2ArCHO + \text{conc.}~NaOH}$
$\ce{-> ArCH2OH + ArCOONa}$
(iv) Vigorous oxidation:
$\ce{${O}C2H5C6H4CHO ->[KMnO4/KOH,~\Delta][H3O^+]}$
$\ce{${O}C6H4(COOH)2}$ (phthalic acid)
(Ar = 2-ethylphenyl)`

export const ANSWERS = {
  '2025M-10': ALDOL_ETHANAL.split('\n').slice(1).join('\n'),

  '2025M-19': r`Cyclohexanecarbaldehyde = $\ce{C6H11CHO}$
(i) $\ce{C6H11CHO + C6H5MgBr ->[dry~ether]}$
$\ce{->[H3O^+] C6H11CH(OH)C6H5}$
(cyclohexylphenylmethanol)
(ii) $\ce{C6H11CHO + 2[Ag(NH3)2]^+ + 3OH^-}$
$\ce{-> C6H11COO^- + 2Ag v}$
$+ \ce{2H2O + 4NH3}$
(cyclohexanecarboxylate; silver mirror)
(iii) Clemmensen reduction:
$\ce{C6H11CHO ->[Zn-Hg/HCl] C6H11CH3 + H2O}$
(methylcyclohexane)`,

  '2026M-10': r`Cyclohexanecarbaldehyde = $\ce{C6H11CHO}$
(i) Grignard addition followed by hydrolysis gives a secondary alcohol:
$\ce{C6H11CHO + C6H5MgBr ->[dry~ether]}$
$\ce{->[H3O^+] C6H11CH(OH)C6H5}$
(cyclohexylphenylmethanol)
(ii) Tollens' reagent oxidises it to the carboxylate; a silver mirror forms:
$\ce{C6H11CHO + 2[Ag(NH3)2]^+ + 3OH^-}$
$\ce{-> C6H11COO^- + 2Ag v}$
$+ \ce{2H2O + 4NH3}$`,

  '2025M-27': r`(A) forms 2,4-DNP derivative, so it is an aldehyde or a ketone. Since it does not reduce Tollens' or Fehling reagent, (A) must be a ketone. (A) responds to iodoform test, so it is a methyl ketone. The formula indicates a high degree of unsaturation, yet it does not decolourise bromine water or Baeyer's reagent; so the unsaturation is due to an aromatic ring.
(B), $\ce{C7H6O2}$, the oxidation product of a ketone, is benzoic acid. So (A) is a monosubstituted aromatic methyl ketone: phenyl methyl ketone (acetophenone), $\ce{C6H5COCH3}$.
Reactions:
(i) 2,4-DNP derivative (orange-red ppt):
$\ce{C6H5COCH3 + H2NNHC6H3(NO2)2}$
$\ce{-> C6H5C(CH3)=NNHC6H3(NO2)2}$
$+ \ce{H2O}$
(ii) Iodoform reaction (yellow ppt):
$\ce{C6H5COCH3 + 3I2 + 4NaOH}$
$\ce{-> C6H5COONa + CHI3 v}$
$+ \ce{3NaI + 3H2O}$
(iii) Oxidation with chromic acid:
$\ce{C6H5COCH3 ->[H2CrO4] C6H5COOH}$
(B, benzoic acid)`,

  '2025S-10': PROPANAL_PROPANONE,

  '2025S-19': r`The conjugate base of a carboxylic acid, the carboxylate ion, is stabilised by two equivalent resonance structures in which the negative charge is at the more electronegative oxygen atom:
$\ce{R-C(=O)-O^- <-> R-C(-O^-)=O}$
The conjugate base of phenol, the phenoxide ion, has more but non-equivalent resonance structures, in which the negative charge is at the less electronegative carbon atoms (o- and p-positions). Therefore resonance in phenoxide ion is not as important as it is in carboxylate ion.
Further, the negative charge is delocalised over two electronegative oxygen atoms in carboxylate ion, whereas it is less effectively delocalised over one oxygen atom and less electronegative carbon atoms in phenoxide ion.
Thus the carboxylate ion is more stabilised than phenoxide ion, so carboxylic acids are more acidic than phenols (pKa ≈ 4.8 for ethanoic acid, 10 for phenol).`,

  '2025S-27': `(i) ${CANNIZZARO}

` + r`(ii) Etard reaction: chromyl chloride ($\ce{CrO2Cl2}$) oxidises the methyl group of toluene to a chromium complex, which on hydrolysis gives the corresponding benzaldehyde. The oxidation stops at the aldehyde stage.
$\ce{C6H5CH3 + CrO2Cl2 ->[CS2]}$
$\ce{C6H5CH(OCrOHCl2)2}$
(chromium complex)
$\ce{->[H3O^+] C6H5CHO}$
(benzaldehyde)`,

  '2024S-10': r`Clemmensen reduction: the carbonyl group of aldehydes and ketones is reduced to $\ce{CH2}$ group on treatment with zinc amalgam and concentrated hydrochloric acid.
$\ce{>C=O ->[Zn-Hg/\text{conc.}~HCl] >CH2 + H2O}$
Example:
$\ce{CH3COCH3}$
$\ce{->[Zn-Hg/HCl] CH3CH2CH3 + H2O}$
(propanone → propane)`,

  '2024S-19': r`(i) From ethylbenzene: alkylbenzenes are oxidised to benzoic acid with alkaline $\ce{KMnO4}$; the entire side chain is oxidised to –COOH:
$\ce{C6H5CH2CH3 ->[KMnO4/KOH,~\Delta] C6H5COOK}$
$\ce{->[H3O^+] C6H5COOH}$
(ii) From benzoic anhydride (hydrolysis):
$\ce{(C6H5CO)2O + H2O -> 2C6H5COOH}$
(iii) From benzamide (acid hydrolysis):
$\ce{C6H5CONH2 + H2O}$
$\ce{->[H^+] C6H5COOH + NH4^+}$`,

  '2024S-20': r`Step 1: Ethanoic acid with ammonia gives ammonium salt, which on heating gives ethanamide:
$\ce{CH3COOH + NH3 -> CH3COONH4}$
$\ce{->[\Delta][-H2O] CH3CONH2}$
Step 2: Hoffmann bromamide degradation gives methanamine:
$\ce{CH3CONH2 + Br2 + 4NaOH}$
$\ce{-> CH3NH2 + Na2CO3}$
$+ \ce{2NaBr + 2H2O}$
Step 3: Methanamine with nitrous acid ($\ce{NaNO2 + HCl}$) gives methanol:
$\ce{CH3NH2 + HNO2}$
$\ce{-> CH3OH + N2 ^ + H2O}$`,

  '2024S-27': r`(1) It forms a 2,4-DNP derivative, so it is an aldehyde or a ketone.
(2) It reduces Tollens' reagent, so it is an aldehyde.
(3) It undergoes Cannizzaro reaction, so the CHO group has no α-hydrogen (CHO attached to the ring).
(4) On vigorous oxidation it gives benzene-1,4-dicarboxylic acid, so two side chains are para to each other.
$\ce{C8H8O}$ = $\ce{C6H4}$ + CHO + $\ce{CH3}$. The compound is 4-methylbenzaldehyde, $\ce{${P}CH3C6H4CHO}$.
Reactions:
(i) 2,4-DNP derivative:
$\ce{ArCHO + H2NNHC6H3(NO2)2}$
$\ce{-> ArCH=NNHC6H3(NO2)2 + H2O}$
(ii) Tollens' test:
$\ce{ArCHO + 2[Ag(NH3)2]^+ + 3OH^-}$
$\ce{-> ArCOO^- + 2Ag v + 2H2O + 4NH3}$
(iii) Cannizzaro reaction:
$\ce{2ArCHO + \text{conc.}~NaOH}$
$\ce{-> ArCH2OH + ArCOONa}$
(iv) Vigorous oxidation:
$\ce{${P}CH3C6H4CHO ->[KMnO4/KOH,~\Delta][H3O^+]}$
$\ce{${P}HOOCC6H4COOH}$
(Ar = 4-methylphenyl)`,

  '2023M-26': ETHYLBENZALDEHYDE,
  '2026M-27': ETHYLBENZALDEHYDE,

  '2023S-25': `(a) ${PROPANAL_PROPANONE}

(b) ${ALDOL_ETHANAL}`,

  '2022M-16': r`Grignard reagent adds to the carbonyl group; the adduct on hydrolysis gives an alcohol.
(i) Formaldehyde gives a primary alcohol:
$\ce{HCHO + CH3MgBr -> CH3CH2OMgBr}$
$\ce{->[H2O] CH3CH2OH + Mg(OH)Br}$
(ethanol)
(ii) Acetaldehyde gives a secondary alcohol:
$\ce{CH3CHO + CH3MgBr}$
$\ce{-> (CH3)2CHOMgBr}$
$\ce{->[H2O] (CH3)2CHOH + Mg(OH)Br}$
(propan-2-ol)
(iii) Acetone gives a tertiary alcohol:
$\ce{CH3COCH3 + CH3MgBr}$
$\ce{-> (CH3)3COMgBr}$
$\ce{->[H2O] (CH3)3COH + Mg(OH)Br}$
(2-methylpropan-2-ol)`,

  '2022M-18': r`(i) $\ce{C6H5COOH + SOCl2}$
$\ce{-> C6H5COCl + SO2 ^ + HCl ^}$
(benzoyl chloride)
(ii) Hell–Volhard–Zelinsky reaction (α-halogenation):
$\ce{CH3COOH ->[(i) X2/red~P][(ii) H2O] X-CH2COOH}$
(2-haloethanoic acid)
(iii) Ammonium salt on heating gives amide:
$\ce{CH3CH2COOH + NH3}$
$\ce{-> CH3CH2COONH4}$
$\ce{->[\Delta][-H2O] CH3CH2CONH2}$
(propanamide)`,

  '2022M-26': r`Wolff–Kishner reduction: the carbonyl group of aldehydes and ketones is reduced to $\ce{CH2}$ group with hydrazine, followed by heating with sodium or potassium hydroxide in a high boiling solvent such as ethylene glycol.
$\ce{>C=O + NH2NH2 ->[-H2O] >C=NNH2}$
$\ce{->[KOH/ethylene~glycol,~\Delta] >CH2 + N2}$
e.g. $\ce{CH3CHO -> CH3CH3}$; $\ce{CH3COCH3 -> CH3CH2CH3}$

Clemmensen reduction: the carbonyl group is reduced to $\ce{CH2}$ group on treatment with zinc amalgam and concentrated hydrochloric acid.
$\ce{>C=O ->[Zn-Hg/\text{conc.}~HCl] >CH2 + H2O}$
e.g. $\ce{CH3CH2CHO ->[Zn-Hg/HCl] CH3CH2CH3}$
$\ce{CH3COCH3 ->[Zn-Hg/HCl] CH3CH2CH3}$`,

  '2022S-20': r`(i) From ethanenitrile: nitriles are hydrolysed to amides and then to acids in the presence of $\ce{H^+}$ or $\ce{OH^-}$ as catalyst:
$\ce{CH3CN ->[H^+/H2O] CH3CONH2}$
$\ce{->[H^+/H2O] CH3COOH + NH4^+}$
(ii) From acetyl chloride (hydrolysis):
$\ce{CH3COCl + H2O -> CH3COOH + HCl}$
(iii) From ethyl ethanoate: acidic hydrolysis of esters gives directly carboxylic acids:
$\ce{CH3COOC2H5 + H2O}$
$\ce{<=>[H^+] CH3COOH + C2H5OH}$`,

  '2022S-26': r`(i) Butan-1-ol to butanoic acid (strong oxidation):
$\ce{CH3CH2CH2CH2OH ->[KMnO4/H^+]}$
$\ce{CH3CH2CH2COOH}$
(ii) Benzyl alcohol to phenylethanoic acid:
$\ce{C6H5CH2OH ->[PBr3] C6H5CH2Br}$
$\ce{->[KCN] C6H5CH2CN}$
$\ce{->[H3O^+] C6H5CH2COOH}$
(iii) 3-Nitrobromobenzene to 3-nitrobenzoic acid:
$\ce{${M}O2NC6H4Br ->[Mg,~dry~ether]}$
$\ce{${M}O2NC6H4MgBr}$
$\ce{->[(i) CO2][(ii) H3O^+] ${M}O2NC6H4COOH}$
(iv) 4-Methylacetophenone to benzene-1,4-dicarboxylic acid (both side chains are oxidised):
$\ce{${P}CH3C6H4COCH3 ->[KMnO4/KOH,~\Delta]}$
$\ce{->[H3O^+] ${P}HOOCC6H4COOH}$`,

  '2021M-18': r`(i) Butanal to butanoic acid (aldehydes are easily oxidised, e.g. by Tollens' reagent or $\ce{K2Cr2O7/H2SO4}$):
$\ce{CH3CH2CH2CHO ->[Tollens'~reagent]}$
$\ce{->[H^+] CH3CH2CH2COOH}$
(ii) Acetone to propane (Wolff–Kishner reduction, or Clemmensen with Zn-Hg/HCl):
$\ce{CH3COCH3 ->[NH2NH2] (CH3)2C=NNH2}$
$\ce{->[KOH/ethylene~glycol,~\Delta] CH3CH2CH3}$
(iii) Benzaldehyde to m-nitrobenzaldehyde (–CHO is meta directing; nitration at 273–283 K):
$\ce{C6H5CHO ->[\text{conc.}~HNO3/\text{conc.}~H2SO4]}$
$\ce{${M}O2NC6H4CHO}$`,

  '2020M-11': CANNIZZARO,

  '2020M-26': `(i) ${TOLLENS}

` + r`(ii) (a) Wolff–Kishner reduction of propanone:
$\ce{CH3COCH3 + NH2NH2}$
$\ce{->[-H2O] (CH3)2C=NNH2}$
$\ce{->[KOH/ethylene~glycol,~\Delta] CH3CH2CH3 + N2}$
(b) Aldol condensation of propanone:
$\ce{2CH3COCH3 <=>[Ba(OH)2]}$
$\ce{(CH3)2C(OH)CH2COCH3}$
(4-hydroxy-4-methylpentan-2-one, ketol)
$\ce{->[\Delta][-H2O] (CH3)2C=CHCOCH3}$
(4-methylpent-3-en-2-one)`,

  '2026M-19': r`When aldol condensation is carried out between two different aldehydes and both have α-hydrogen, a mixture of four products is formed (cross aldol condensation). Propanal ($\ce{CH3CH2CHO}$) and butanal ($\ce{CH3CH2CH2CHO}$) with dilute NaOH, then heat:
(i) $\ce{CH3CH2CH=C(CH3)CHO}$: 2-methylpent-2-enal (propanal + propanal)
(ii) $\ce{CH3CH2CH2CH=C(C2H5)CHO}$: 2-ethylhex-2-enal (butanal + butanal)
(iii) $\ce{CH3CH2CH2CH=C(CH3)CHO}$: 2-methylhex-2-enal (propanal as nucleophile + butanal)
(iv) $\ce{CH3CH2CH=C(C2H5)CHO}$: 2-ethylpent-2-enal (butanal as nucleophile + propanal)`,
}
