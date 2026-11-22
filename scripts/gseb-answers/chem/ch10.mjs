// Ch 10 Biomolecules. NCERT wording (lech205, Rationalised 2023-24).
import { AFTER as CHEM_2024_MAIN } from '../chem-2024-wrap.mjs'
const r = String.raw

const GLU = r`CHO-(CHOH)4-CH2OH`
const BR2 = r`With bromine water (mild oxidising agent) glucose gets oxidised to a six carbon carboxylic acid, gluconic acid. This indicates that the carbonyl group is present as an aldehydic group:
$\ce{${GLU}}$
$\ce{->[Br2~water] COOH-(CHOH)4-CH2OH}$
(gluconic acid)`
const HNO3 = r`On oxidation with nitric acid, glucose as well as gluconic acid both yield a dicarboxylic acid, saccharic acid. This indicates the presence of a primary alcoholic (–OH) group in glucose:
$\ce{${GLU}}$
$\ce{->[HNO3] COOH-(CHOH)4-COOH}$
(saccharic acid)`
const CARBONYL = r`Glucose reacts with hydroxylamine to form an oxime and adds a molecule of hydrogen cyanide to give a cyanohydrin. These reactions confirm the presence of a carbonyl group (>C=O) in glucose:
$\ce{${GLU} ->[NH2OH]}$
$\ce{CH(=N-OH)-(CHOH)4-CH2OH}$
(glucose oxime)
$\ce{${GLU} ->[HCN]}$
$\ce{CH(OH)(CN)-(CHOH)4-CH2OH}$
(glucose cyanohydrin)`

const PEPTIDE = r`Proteins are polymers of α-amino acids connected to each other by peptide bond (peptide linkage). Chemically, a peptide linkage is an amide formed between the –COOH group of one amino acid and the $\ce{-NH2}$ group of another, with elimination of a water molecule. The peptide bond is –CO–NH–.
Example: when the carboxyl group of glycine combines with the amino group of alanine we get a dipeptide, glycylalanine:
$\ce{H2N-CH2-COOH}$ (glycine) +
$\ce{H2N-CH(CH3)-COOH}$ (alanine)
$\ce{->[-H2O]}$
$\ce{H2N-CH2-CO-NH-CH(CH3)COOH}$
(Gly-Ala)`

const AMPHOTERIC = r`Amino acids contain both an acidic (carboxyl) group and a basic (amino) group in the same molecule. In aqueous solution the carboxyl group can lose a proton and the amino group can accept a proton, giving rise to a dipolar ion known as zwitter ion. It is neutral but contains both positive and negative charges:
$\ce{H2N-CHR-COOH}$
$\ce{<=> H3N^+-CHR-COO^-}$
In zwitter ionic form amino acids show amphoteric behaviour, as they react both with acids and bases:
with acid: $\ce{H3N^+-CHR-COO^- + H^+}$
$\ce{-> H3N^+-CHR-COOH}$
with base: $\ce{H3N^+-CHR-COO^- + OH^-}$
$\ce{-> H2N-CHR-COO^- + H2O}$`

export const ANSWERS = {
  '2025M-11': `(i) ${BR2}

(ii) ${HNO3}`,

  '2025M-12': r`Vitamin B₆: convulsions
Vitamin B₁₂: pernicious anaemia (RBC deficient in haemoglobin)
Thiamine (vitamin B₁): beri beri (loss of appetite, retarded growth)
Ascorbic acid (vitamin C): scurvy (bleeding gums)`,

  '2025S-11': PEPTIDE,
  '2022S-9': PEPTIDE,

  '2025S-12': r`A nucleotide consists of a base, a pentose sugar and a phosphate group. In DNA the sugar is β-D-2-deoxyribose. So hydrolysis of a DNA nucleotide containing thymine gives:
(i) 2-deoxy-D-ribose (pentose sugar)
(ii) phosphoric acid, $\ce{H3PO4}$
(iii) thymine (nitrogenous base, a pyrimidine)`,

  '2024S-11': r`Sucrose on hydrolysis gives an equimolar mixture of D-(+)-glucose and D-(−)-fructose. These two monosaccharides are held together by a glycosidic linkage between C1 of α-D-glucose and C2 of β-D-fructose.
Since the reducing groups of glucose (aldehydic, at C1) and fructose (ketonic, at C2) are both involved in glycosidic bond formation, no free aldehyde or ketone group can be produced. So sucrose does not reduce Fehling's solution or Tollens' reagent; it is a non-reducing sugar.`,

  '2024S-12': CHEM_2024_MAIN['12'],

  '2023M-7': r`DNA | RNA
(i) The sugar is β-D-2-deoxyribose. | The sugar is β-D-ribose.
(ii) Bases: adenine, guanine, cytosine and thymine. | Bases: adenine, guanine, cytosine and uracil (thymine is absent).
(iii) Double strand helix: two chains are held together by hydrogen bonds between pairs of bases (A–T, C–G). | Single stranded helix, which sometimes folds back on itself.`,

  '2023M-8': r`A protein found in a biological system with a unique three-dimensional structure and biological activity is called a native protein. When a native protein is subjected to physical change like change in temperature, or chemical change like change in pH, the hydrogen bonds are disturbed. Due to this, globules unfold and helix gets uncoiled, and the protein loses its biological activity. This is called denaturation of protein.
During denaturation the secondary and tertiary structures are destroyed, but the primary structure remains intact.
Examples: coagulation of egg white on boiling; curdling of milk (due to lactic acid formed by bacteria).`,

  '2023M-10': r`(1) From sucrose (cane sugar): if sucrose is boiled with dilute HCl or $\ce{H2SO4}$ in alcoholic solution, glucose and fructose are obtained in equal amounts:
$\ce{C12H22O11 + H2O ->[H^+]}$
$\ce{C6H12O6 + C6H12O6}$
(sucrose → glucose + fructose)
(2) From starch: commercially glucose is obtained by hydrolysis of starch by boiling it with dilute $\ce{H2SO4}$ at 393 K under pressure:
$\ce{(C6H10O5)_n + nH2O}$
$\ce{->[H^+][393 K,~2-3 atm] nC6H12O6}$`,

  '2023S-1': r`(1) Sucrose on hydrolysis gives an equimolar mixture of D-(+)-glucose and D-(−)-fructose:
$\ce{C12H22O11 + H2O -> C6H12O6 + C6H12O6}$
(The mixture is laevorotatory, so it is called invert sugar.)
(2) Lactose (milk sugar) on hydrolysis gives β-D-galactose and β-D-glucose:
$\ce{C12H22O11 + H2O -> C6H12O6 + C6H12O6}$
(galactose + glucose)`,

  '2023S-2': r`All those carbohydrates which reduce Fehling's solution and Tollens' reagent are referred to as reducing sugars. All monosaccharides, whether aldose or ketose, are reducing sugars.
In disaccharides, sugars in which the aldehydic or ketonic groups are free are reducing sugars, for example maltose and lactose. (Sucrose, in which these groups are bonded, is non-reducing.)
Example: glucose reduces Tollens' reagent to a silver mirror:
$\ce{C6H12O6 ->[Tollens'] gluconate + Ag v}$`,

  '2023S-10': r`(i) Five –OH groups: acetylation of glucose with acetic anhydride gives glucose pentaacetate, which confirms the presence of five –OH groups:
$\ce{${GLU}}$
$\ce{->[(CH3CO)2O]}$
$\ce{CHO-(CHOCOCH3)4-CH2OCOCH3}$
Since it exists as a stable compound, the five –OH groups should be attached to different carbon atoms.

(ii) One primary –OH group: ${HNO3}`,

  '2022M-9': `(i) Presence of >C=O group: ${CARBONYL}

(ii) Presence of primary –OH group: ${HNO3}`,

  '2022M-10': r`Starch is the main storage polysaccharide of plants. It is the most important dietary source for human beings; high content is found in cereals, roots, tubers and some vegetables. It is a polymer of α-glucose and consists of two components, amylose and amylopectin.
Amylose: water soluble component, about 15–20% of starch. It is a long unbranched chain of 200–1000 α-D-(+)-glucose units held together by C1–C4 glycosidic linkage.
Amylopectin: insoluble in water, about 80–85% of starch. It is a branched chain polymer of α-D-glucose units in which the chain is formed by C1–C4 glycosidic linkage, whereas branching occurs by C1–C6 glycosidic linkage.`,

  '2022M-11': AMPHOTERIC,

  '2022S-7': r`The carbohydrates are stored in the animal body as glycogen. It is also known as animal starch because its structure is similar to amylopectin, and it is rather more highly branched (α-D-glucose units, C1–C4 linkage in the chain and C1–C6 at branches).
It is present in liver, muscles and brain. When the body needs glucose, enzymes break the glycogen down to glucose. Glycogen is also found in yeast and fungi.`,

  '2022S-8': CARBONYL + r`
With bromine water glucose gives gluconic acid, which shows that the carbonyl group is an aldehydic group.`,

  '2021M-7': r`Nucleoside: a unit formed by the attachment of a base to the 1′ position of the sugar.
Nucleoside = base + sugar
Nucleotide: when a nucleoside is linked to phosphoric acid at the 5′-position of the sugar moiety, we get a nucleotide.
Nucleotide = base + sugar + phosphate
Nucleotides are joined together by phosphodiester linkage between 5′ and 3′ carbon atoms of the pentose sugar to form nucleic acids.`,

  '2021M-8': r`RNA molecules are of three types and they perform different functions:
(i) messenger RNA (m-RNA)
(ii) ribosomal RNA (r-RNA)
(iii) transfer RNA (t-RNA)
The message for the synthesis of a particular protein is present in DNA; proteins are synthesised by these RNA molecules in the cell.`,

  '2021M-10': r`On prolonged heating with HI, glucose forms n-hexane:
$\ce{${GLU} ->[HI,~\Delta]}$
$\ce{CH3-CH2-CH2-CH2-CH2-CH3}$
(n-hexane)
This suggests that all the six carbon atoms in glucose are linked in a straight chain.`,

  '2020M-7': `(i) –CHO group: ${BR2}

(ii) >C=O group: ${CARBONYL}`,

  '2020M-8': r`Monosaccharides: ribose, 2-deoxyribose, galactose, fructose
Disaccharides: maltose, lactose`,

  '2026M-11': r`Amino acids contain both an acidic –COOH and a basic $\ce{-NH2}$ group. In the solid state and in water they exist as dipolar zwitter ions:
$\ce{H2N-CHR-COOH}$
$\ce{<=> H3N^+-CHR-COO^-}$
So they behave like salts. Strong electrostatic (dipole-dipole/ionic) attractions between the zwitter ions give them high melting points, and they are highly solvated by water, so they are more soluble.
Halo acids ($\ce{X-CHR-COOH}$) do not contain a basic group, cannot form zwitter ions and do not behave like salts; their molecules are held only by weaker forces. Hence amino acids have higher melting points and solubility in water than the corresponding halo acids.`,

  '2026M-12': r`Vitamins are classified into two groups depending upon their solubility in water or fat:
(i) Fat soluble vitamins: soluble in fat and oils but insoluble in water; vitamins A, D, E and K. They are stored in liver and adipose (fat storing) tissues.
(ii) Water soluble vitamins: B group vitamins and vitamin C. They must be supplied regularly in diet because they are readily excreted in urine and cannot be stored (except vitamin B₁₂) in our body.
Vitamin responsible for coagulation of blood: vitamin K (its deficiency increases blood clotting time).`,
}
