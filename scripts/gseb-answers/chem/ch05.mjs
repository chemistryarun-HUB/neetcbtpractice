// Ch 5 Coordination Compounds. NCERT wording (lech105, Rationalised 2023-24).
// Isomer questions also get a drawn answer image (see IMAGES, files in chem/img/).
const r = String.raw

const NI_PAIR = r`$\ce{[NiCl4]^{2-}}$ (tetrahedral):
Nickel is in +2 oxidation state, $\ce{Ni^{2+}}$: $[\ce{Ar}]\,3d^8$
3d: ↿⇂ ↿⇂ ↿⇂ ↿ ↿ | 4s: ☐ | 4p: ☐ ☐ ☐
$\ce{Cl^-}$ is a weak ligand, so the 3d electrons do not pair up. One 4s and three 4p orbitals hybridise → four $sp^3$ hybrid orbitals oriented tetrahedrally.
Each $\ce{Cl^-}$ ion donates a pair of electrons into an $sp^3$ orbital.
Two unpaired electrons remain, so $\ce{[NiCl4]^{2-}}$ is paramagnetic ($\mu = \sqrt{8} = 2.83$ BM).

$\ce{[Ni(CN)4]^{2-}}$ (square planar):
$\ce{Ni^{2+}}$: $3d^8$. In presence of the strong $\ce{CN^-}$ ligand the two unpaired 3d electrons pair up, leaving one 3d orbital empty:
3d: ↿⇂ ↿⇂ ↿⇂ ↿⇂ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
One 3d, one 4s and two 4p orbitals hybridise → four $dsp^2$ hybrid orbitals, square planar.
Each hybridised orbital receives a pair of electrons from a cyanide ion.
The compound is diamagnetic, as evident from the absence of unpaired electrons.`

const CARBONYL = r`The metal-carbon bond in metal carbonyls possesses both σ and π character.
(i) The M–C σ bond is formed by the donation of the lone pair of electrons on the carbonyl carbon into a vacant orbital of the metal.
(ii) The M–C π bond is formed by the donation of a pair of electrons from a filled d orbital of the metal into the vacant antibonding π* orbital of carbon monoxide (back bonding).
The metal to ligand bonding creates a synergic effect which strengthens the bond between CO and the metal.
Examples: $\ce{[Ni(CO)4]}$ tetrahedral, $\ce{[Fe(CO)5]}$ trigonal bipyramidal, $\ce{[Cr(CO)6]}$ octahedral.`

const LINKAGE = r`Linkage isomerism arises in a coordination compound containing an ambidentate ligand (a ligand which has two different donor atoms, either of which can bind the metal).
Example: thiocyanate, $\ce{NCS^-}$, may bind through nitrogen to give M–NCS or through sulphur to give M–SCN.
Jørgensen discovered such behaviour in $\ce{[Co(NH3)5(NO2)]Cl2}$, obtained as the red form, in which the nitrite ligand is bound through oxygen (–ONO), and as the yellow form, in which it is bound through nitrogen (–$\ce{NO2}$).`

const CO_EN2_CL2 = r`$\ce{[CoCl2(en)2]^+}$ is an octahedral complex of the type $\ce{[M(AA)2X2]}$; it shows two geometrical isomers:
(i) trans isomer: the two Cl are opposite to each other (180°). It has a plane of symmetry, so it is optically inactive.
(ii) cis isomer: the two Cl are adjacent (90°). It has no plane of symmetry, so it exists as two optical isomers (d and l, non-superimposable mirror images).
In all there are three isomers: trans, and cis-d and cis-l. (See the figure.)`

const FAC_MER = r`$\ce{[Co(NH3)3(NO2)3]}$ is an octahedral complex of the type $\ce{[Ma3b3]}$. It shows two geometrical isomers:
(i) facial (fac) isomer: the three donor atoms of the same ligand ($\ce{NH3}$) occupy adjacent positions at the corners of one octahedral face.
(ii) meridional (mer) isomer: the three $\ce{NH3}$ are around the meridian of the octahedron (two of them trans to each other).
(See the figure.)`

export const ANSWERS = {
  '2025M-5': r`(i) $\ce{[Ag(NH3)2][Ag(CN)2]}$: diamminesilver(I) dicyanidoargentate(I)
(ii) $\ce{[Pt(NH3)2Cl(NO2)]}$: diamminechloridonitrito-N-platinum(II)`,

  '2025M-6': r`$\ce{[Cr(NH3)2Cl2(en)]^+}$ is octahedral. In the isomer in which the two Cl are cis to each other and the two $\ce{NH3}$ are also cis, there is no plane of symmetry. So it exists as two optical isomers (d and l) which are non-superimposable mirror images of each other. (See the figure.)
(The isomers with two Cl trans, or two $\ce{NH3}$ trans, have a plane of symmetry and are optically inactive.)`,

  '2025M-25': NI_PAIR,
  '2024S-25': NI_PAIR,

  '2025S-5': r`When a di- or polydentate ligand uses its two or more donor atoms simultaneously to bind a single metal ion, it is said to be a chelate ligand. Such complexes, called chelate complexes, tend to be more stable than similar complexes containing unidentate ligands.
Example: ethane-1,2-diamine (en), $\ce{H2NCH2CH2NH2}$, binds through its two N atoms, e.g. in $\ce{[Co(en)3]^{3+}}$. Oxalate ($\ce{C2O4^{2-}}$) and $\ce{EDTA^{4-}}$ are other chelating ligands.`,

  '2025S-6': LINKAGE,
  '2021M-12': LINKAGE,

  '2025S-25': r`$\ce{[Co(NH3)5Cl]SO4}$
(i) IUPAC name: pentaamminechloridocobalt(III) sulphate
(ii) Ionisation isomer: $\ce{[Co(NH3)5(SO4)]Cl}$ (pentaamminesulphatocobalt(III) chloride)
(iii) Primary valence (oxidation state, ionisable) of Co = 3; secondary valence (coordination number, non-ionisable) = 6.
(iv) $\ce{Co^{3+}}$: $3d^6$. $\ce{NH3}$ pairs the 3d electrons:
3d: ↿⇂ ↿⇂ ↿⇂ ☐ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
Two 3d, one 4s and three 4p orbitals hybridise → $d^2sp^3$, octahedral, inner orbital (low spin) complex, diamagnetic.`,

  '2024S-5': FAC_MER,
  '2022M-5': FAC_MER,

  '2024S-6': r`A ligand which has two different donor atoms and either of the two ligates in the complex is called an ambidentate ligand.
Examples: $\ce{NO2^-}$ ion can coordinate either through nitrogen (nitrito-N, M–$\ce{NO2}$) or through oxygen (nitrito-O, M–ONO) to a central metal atom/ion. Similarly, $\ce{SCN^-}$ can coordinate through the sulphur (M–SCN) or nitrogen atom (M–NCS).`,

  '2023M-4': CARBONYL,
  '2026M-1': CARBONYL,

  '2023M-11': CO_EN2_CL2,
  '2022S-4': CO_EN2_CL2,
  '2026M-8': CO_EN2_CL2,

  '2023M-25': r`$\ce{Mn^{2+}}$: $[\ce{Ar}]\,3d^5$. In an octahedral field the d orbitals split into lower $t_{2g}$ (three) and higher $e_g$ (two) sets, separated by $\Delta_o$.

$\ce{[Mn(H2O)6]^{2+}}$: $\ce{H2O}$ is a weak field ligand, $\Delta_o < P$ (pairing energy). The electrons occupy the $e_g$ orbitals rather than pair up:
$t_{2g}^3 e_g^2$ (↿ ↿ ↿ | ↿ ↿) → five unpaired electrons, high spin complex.

$\ce{[Mn(CN)6]^{4-}}$: $\ce{CN^-}$ is a strong field ligand, $\Delta_o > P$. It is more favourable for the electrons to pair in the $t_{2g}$ orbitals:
$t_{2g}^5 e_g^0$ (↿⇂ ↿⇂ ↿ | – –) → only one unpaired electron, low spin complex.`,

  '2023S-8': r`$\ce{[Co(NH3)Cl(en)2]^{2+}}$ is octahedral, type $\ce{[M(AA)2XY]}$.
(i) trans isomer: $\ce{NH3}$ and Cl are opposite each other; the two en lie in one plane. It has a plane of symmetry, so it is optically inactive.
(ii) cis isomer: $\ce{NH3}$ and Cl are adjacent. It has no plane of symmetry, so it exists as a pair of optical isomers (d and l, non-superimposable mirror images).
Total: three stereoisomers. (See the figure.)`,

  '2023S-12': r`When ligands approach the metal ion, the degeneracy of the d orbitals is lifted. In an octahedral field the $d_{x^2-y^2}$ and $d_{z^2}$ orbitals ($e_g$) point towards the ligands and are raised in energy, while $d_{xy}$, $d_{yz}$, $d_{xz}$ ($t_{2g}$) are lowered. The energy separation between the two sets is the crystal field splitting energy, $\Delta_o$. ($e_g$ rises by $\tfrac{3}{5}\Delta_o$, $t_{2g}$ falls by $\tfrac{2}{5}\Delta_o$.)

For $d^4$ ions the fourth electron can pair in $t_{2g}$ or enter $e_g$; this depends on $\Delta_o$ and the pairing energy P:
(i) If $\Delta_o < P$, the fourth electron enters one of the $e_g$ orbitals: $t_{2g}^3 e_g^1$. Such ligands are weak field ligands and form high spin complexes.
(ii) If $\Delta_o > P$, the fourth electron pairs in a $t_{2g}$ orbital: $t_{2g}^4 e_g^0$. Such ligands are strong field ligands and form low spin complexes.`,

  '2023S-26': r`(a) (i) $\ce{K3[Cr(C2O4)3]}$: potassium trioxalatochromate(III)
(ii) Tetraammineaquachloridocobalt(III) chloride: $\ce{[Co(NH3)4(H2O)Cl]Cl2}$

(b) $\ce{[Cr(NH3)6]^{3+}}$: $\ce{Cr^{3+}}$ = $3d^3$
3d: ↿ ↿ ↿ ☐ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
Two vacant 3d orbitals are available, so $d^2sp^3$ hybridisation (octahedral) takes place without pairing. Three unpaired electrons remain, so it is paramagnetic ($\mu = \sqrt{15} = 3.87$ BM).

$\ce{[Ni(CN)4]^{2-}}$: $\ce{Ni^{2+}}$ = $3d^8$. The strong $\ce{CN^-}$ ligand pairs the two unpaired electrons:
3d: ↿⇂ ↿⇂ ↿⇂ ↿⇂ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
$dsp^2$ hybridisation, square planar. No unpaired electron, so it is diamagnetic.`,

  '2022M-4': r`(1) $\ce{K2[Zn(OH)4]}$: potassium tetrahydroxidozincate(II)
(2) $\ce{K3[Cr(C2O4)3]}$: potassium trioxalatochromate(III)`,

  '2022M-24': r`$\ce{[Fe(H2O)6]^{3+}}$: $\ce{Fe^{3+}}$ = $[\ce{Ar}]\,3d^5$
3d: ↿ ↿ ↿ ↿ ↿ | 4s: ☐ | 4p: ☐ ☐ ☐ | 4d: ☐ ☐
$\ce{H2O}$ is a weak ligand, so the 3d electrons do not pair. The complex uses outer 4d orbitals: one 4s, three 4p and two 4d → $sp^3d^2$, octahedral, outer orbital (high spin) complex.
Five unpaired electrons → paramagnetic ($\mu = \sqrt{35} = 5.92$ BM).

$\ce{[Fe(CN)6]^{4-}}$: $\ce{Fe^{2+}}$ = $[\ce{Ar}]\,3d^6$
In presence of the strong $\ce{CN^-}$ ligand the 3d electrons pair up:
3d: ↿⇂ ↿⇂ ↿⇂ ☐ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
Two 3d, one 4s and three 4p orbitals hybridise → $d^2sp^3$, octahedral, inner orbital (low spin) complex. Six pairs of electrons from six $\ce{CN^-}$ occupy the hybrid orbitals.
No unpaired electron → diamagnetic.`,

  '2022S-12': r`In $\ce{[NiCl4]^{2-}}$ nickel is in +2 oxidation state and the ion has the electronic configuration $3d^8$.
3d: ↿⇂ ↿⇂ ↿⇂ ↿ ↿ | 4s: ☐ | 4p: ☐ ☐ ☐
In tetrahedral complexes one s and three p orbitals are hybridised to form four equivalent $sp^3$ orbitals oriented tetrahedrally.
Each $\ce{Cl^-}$ ion donates a pair of electrons into an $sp^3$ hybrid orbital.
The compound is paramagnetic since it contains two unpaired electrons.`,

  '2022S-25': r`$\ce{[Co(C2O4)3]^{3-}}$: oxalate is a didentate ligand, so the coordination number of Co is 6.
Cobalt is in +3 oxidation state: $\ce{Co^{3+}}$ = $[\ce{Ar}]\,3d^6$
In the complex the 3d electrons pair up, leaving two 3d orbitals empty:
3d: ↿⇂ ↿⇂ ↿⇂ ☐ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
Two inner 3d, one 4s and three 4p orbitals hybridise → six $d^2sp^3$ hybrid orbitals, octahedral.
Six pairs of electrons from the three oxalate ions (six O donor atoms) occupy these orbitals.
It is an inner orbital (low spin) complex. As there is no unpaired electron, $\ce{[Co(C2O4)3]^{3-}}$ is diamagnetic.`,

  '2021M-11': r`$\ce{[Pt(NH3)(Br)(Cl)(py)]}$ is a square planar complex of the type $\ce{[MABXL]}$. It shows three geometrical isomers. Taking $\ce{NH3}$ fixed, the ligand trans to it can be:
(i) Br (then Cl trans to py)
(ii) Cl (then Br trans to py)
(iii) py (then Br trans to Cl)
(See the figure.) None of these shows optical isomerism, because a square planar complex has a plane of symmetry (the plane of the molecule).`,

  '2021M-16': r`$\ce{K4[Fe(CN)6]}$: complex ion $\ce{[Fe(CN)6]^{4-}}$
Oxidation state of Fe: $x + 6(-1) = -4$, so $x = +2$
$\ce{Fe^{2+}}$: $[\ce{Ar}]\,3d^6$ (free ion: ↿⇂ ↿ ↿ ↿ ↿)
$\ce{CN^-}$ is a strong ligand, so the 3d electrons pair up:
3d: ↿⇂ ↿⇂ ↿⇂ ☐ ☐ | 4s: ☐ | 4p: ☐ ☐ ☐
Two 3d, one 4s and three 4p orbitals hybridise → six $d^2sp^3$ hybrid orbitals, octahedral.
Six pairs of electrons from six $\ce{CN^-}$ ions occupy the six hybrid orbitals.
Inner orbital (low spin) complex; no unpaired electron, so it is diamagnetic.`,

  '2021M-25': r`(i) $\ce{K3[Co(C2O4)3]}$: potassium trioxalatocobaltate(III)
$\ce{Co^{3+}}$: $3d^6$; inner orbital $d^2sp^3$ complex with all electrons paired (3d: ↿⇂ ↿⇂ ↿⇂ ☐ ☐)
$n = 0$, $\mu = 0$ (diamagnetic)

(ii) $\ce{Cs[FeCl4]}$: caesium tetrachloridoferrate(III)
$\ce{Fe^{3+}}$: $3d^5$; $\ce{Cl^-}$ is a weak ligand, $sp^3$ (tetrahedral), no pairing (3d: ↿ ↿ ↿ ↿ ↿)
$n = 5$
$\mu = \sqrt{n(n+2)} = \sqrt{35} = 5.92$ BM`,

  '2020M-3': r`$\ce{[Fe(NH3)2(CN)4]^-}$ is an octahedral complex of the type $\ce{[Ma2b4]}$. It shows two geometrical isomers:
(i) cis isomer: the two $\ce{NH3}$ are adjacent (90°).
(ii) trans isomer: the two $\ce{NH3}$ are opposite each other (180°).
(See the figure.)`,

  '2020M-4': r`Limitations of valence bond theory (any four):
(i) It involves a number of assumptions.
(ii) It does not give quantitative interpretation of magnetic data.
(iii) It does not explain the colour exhibited by coordination compounds.
(iv) It does not give a quantitative interpretation of the thermodynamic or kinetic stabilities of coordination compounds.
(v) It does not make exact predictions regarding the tetrahedral and square planar structures of 4-coordinate complexes.
(vi) It does not distinguish between weak and strong ligands.`,

  '2020M-25': r`(i) $\ce{[Ti(H2O)6]^{3+}}$ is an octahedral complex where the single electron ($\ce{Ti^{3+}}$ is a $3d^1$ system) is in the $t_{2g}$ level in the ground state. The next higher state available for the electron is the empty $e_g$ level. If light corresponding to the energy of the blue-green region is absorbed by the complex, it excites the electron from the $t_{2g}$ level to the $e_g$ level ($t_{2g}^1e_g^0 \to t_{2g}^0e_g^1$). Consequently the complex appears violet in colour (complementary colour). The crystal field theory attributes the colour of coordination compounds to d–d transition of the electron.

(ii) ` + CARBONYL,

  '2026M-25': r`$\ce{K[Cr(H2O)2(C2O4)2].3H2O}$
(i) IUPAC name: potassium diaquadioxalatochromate(III) trihydrate
(ii) Oxidation number of Cr: $x + 2(0) + 2(-2) = -1$, so $x = +3$
Coordination number = 6 (2 $\ce{H2O}$ + 2 didentate oxalate)
(iii) $\ce{Cr^{3+}}$: $3d^3$. In the octahedral field: $t_{2g}^3 e_g^0$ (↿ ↿ ↿ | – –)
(iv) Shape: octahedral ($d^2sp^3$)
Unpaired electrons $n = 3$
$\mu = \sqrt{n(n+2)} = \sqrt{15} = 3.87$ BM`,
}

// Drawn figures (chem/img/*.png) uploaded as answer_image for the isomer questions.
export const IMAGES = {
  '2025M-6': 'cr_nh3_2_cl2_en_optical.png',
  '2024S-5': 'co_nh3_3_no2_3_fac_mer.png',
  '2022M-5': 'co_nh3_3_no2_3_fac_mer.png',
  '2023M-11': 'co_cl2_en2.png',
  '2022S-4': 'co_cl2_en2.png',
  '2026M-8': 'co_cl2_en2.png',
  '2023S-8': 'co_nh3_cl_en2.png',
  '2021M-11': 'pt_nh3_br_cl_py.png',
  '2020M-3': 'fe_nh3_2_cn_4.png',
}
