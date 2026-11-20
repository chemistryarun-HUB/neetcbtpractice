// Chemistry 2024 Main, Part B: long equations split over two lines so they fit
// one column of the two-column paper PDF (they were cut off at the column
// edge). Each entry replaces one $…$ with shorter ones on separate lines.
const r = String.raw

export const SPLITS = [
  [r`$\ce{CH3CH2Br + NaI ->[\text{dry acetone}] CH3CH2I + NaBr v}$`, r`$\ce{CH3CH2Br + NaI}$
$\ce{->[\text{dry acetone}] CH3CH2I + NaBr v}$`],
  [r`$\ce{2C6H5Cl + 2Na ->[\text{dry ether}] C6H5-C6H5 + 2NaCl}$`, r`$\ce{2C6H5Cl + 2Na}$
$\ce{->[\text{dry ether}] C6H5-C6H5 + 2NaCl}$`],
  [r`$\ce{C6H5CH(CH3)2 ->[O2~\text{(air)}] C6H5C(CH3)2-O-OH}$`, r`$\ce{C6H5CH(CH3)2}$
$\ce{->[O2~\text{(air)}] C6H5C(CH3)2-O-OH}$`],
  [r`$\ce{C6H5C(CH3)2-O-OH ->[H^+/H2O] C6H5OH + CH3COCH3}$`, r`$\ce{C6H5C(CH3)2-O-OH}$
$\ce{->[H^+/H2O] C6H5OH + CH3COCH3}$`],
  [r`$\ce{C6H12O6 ->[(CH3CO)2O] CHO-(CHOCOCH3)4-CH2OCOCH3}$`, r`$\ce{C6H12O6 ->[(CH3CO)2O]}$
$\ce{CHO-(CHOCOCH3)4-CH2OCOCH3}$`],
  [r`$E_a = \dfrac{\log 3.5 \times 2.303 \times 8.314 \times 500 \times 700}{200} = 0.5441 \times 2.303 \times 8.314 \times 1750$`, r`$E_a = \dfrac{\log 3.5 \times 2.303 \times 8.314 \times 500 \times 700}{200}$
$E_a = 0.5441 \times 2.303 \times 8.314 \times 1750$`],
  [r`$\log A = \log 0.02 + \dfrac{18231}{2.303 \times 8.314 \times 500} = -1.699 + 1.904 = 0.205$`, r`$\log A = \log 0.02 + \dfrac{18231}{2.303 \times 8.314 \times 500}$
$\log A = -1.699 + 1.904 = 0.205$`],
  [r`$\ce{4FeCr2O4 + 8Na2CO3 + 7O2 -> 8Na2CrO4 + 2Fe2O3 + 8CO2}$`, r`$\ce{4FeCr2O4 + 8Na2CO3 + 7O2}$
$\ce{-> 8Na2CrO4 + 2Fe2O3 + 8CO2}$`],
  [r`$\ce{2Na2CrO4 + 2H^+ -> Na2Cr2O7 + 2Na^+ + H2O}$`, r`$\ce{2Na2CrO4 + 2H^+}$
$\ce{-> Na2Cr2O7 + 2Na^+ + H2O}$`],
  [r`$\ce{2(CH3)2CH-CH2Br + 2Na ->[\text{dry ether}] (CH3)2CH-CH2-CH2-CH(CH3)2 + 2NaBr}$`, r`$\ce{2(CH3)2CH-CH2Br + 2Na ->[\text{dry ether}]}$
$\ce{(CH3)2CH-CH2-CH2-CH(CH3)2 + 2NaBr}$`],
  [r`$\ce{HCHO + RMgX ->[\text{dry ether}] ->[H2O/H^+] RCH2OH + Mg(OH)X}$`, r`$\ce{HCHO + RMgX ->[\text{dry ether}]}$
$\ce{->[H2O/H^+] RCH2OH + Mg(OH)X}$`],
  [r`$\ce{RCHO + R'MgX ->[\text{dry ether}] ->[H2O/H^+] RCH(OH)R' + Mg(OH)X}$`, r`$\ce{RCHO + R'MgX ->[\text{dry ether}]}$
$\ce{->[H2O/H^+] RCH(OH)R' + Mg(OH)X}$`],
  [r`$\ce{RCOR' + R''MgX ->[\text{dry ether}] ->[H2O/H^+] RR'C(OH)R'' + Mg(OH)X}$`, r`$\ce{RCOR' + R''MgX ->[\text{dry ether}]}$
$\ce{->[H2O/H^+] RR'C(OH)R'' + Mg(OH)X}$`],
  [r`$\ce{C6H4(CO)2N^-K^+ + R-X ->[-KX] C6H4(CO)2N-R}$`, r`$\ce{C6H4(CO)2N^-K^+ + R-X}$
$\ce{->[-KX] C6H4(CO)2N-R}$`],
  [r`$\ce{C6H4(CO)2N-R ->[NaOH(aq)] R-NH2 + C6H4(COO^-Na^+)2}$`, r`$\ce{C6H4(CO)2N-R ->[NaOH(aq)]}$
$\ce{R-NH2 + C6H4(COO^-Na^+)2}$`],
  [r`$\ce{R-NH2 ->[NaNO2 + HCl] [R-N2^+Cl^-] ->[H2O] ROH + N2 ^ + HCl}$`, r`$\ce{R-NH2 ->[NaNO2 + HCl] [R-N2^+Cl^-]}$
$\ce{->[H2O] ROH + N2 ^ + HCl}$`],
  [r`$\ce{C6H5NH2 + NaNO2 + 2HCl ->[\text{273-278 K}] C6H5N2^+Cl^- + NaCl + 2H2O}$`, r`$\ce{C6H5NH2 + NaNO2 + 2HCl}$
$\ce{->[\text{273-278 K}] C6H5N2^+Cl^- + NaCl + 2H2O}$`],
  [r`$\ce{2Fe(s) + O2(g) + 4H^+(aq) -> 2Fe^{2+}(aq) + 2H2O(l)}$`, r`$\ce{2Fe(s) + O2(g) + 4H^+(aq)}$
$\ce{-> 2Fe^{2+}(aq) + 2H2O(l)}$`],
  [r`$\ce{2Fe^{2+}(aq) + 2H2O(l) + 1/2O2(g) -> Fe2O3(s) + 4H^+(aq)}$`, r`$\ce{2Fe^{2+}(aq) + 2H2O(l) + 1/2O2(g)}$
$\ce{-> Fe2O3(s) + 4H^+(aq)}$`],
  [r`$\ce{(CH3)3C-OH ->[Cu,~\text{573 K}] (CH3)2C=CH2 + H2O}$`, r`$\ce{(CH3)3C-OH}$
$\ce{->[Cu,~\text{573 K}] (CH3)2C=CH2 + H2O}$`],
  [r`$\ce{C6H5OH ->[Br2/CS2,~\text{273 K}] \mathit{p}\text{-}BrC6H4OH + \mathit{o}\text{-}BrC6H4OH}$`, r`$\ce{C6H5OH ->[Br2/CS2,~\text{273 K}]}$
$\ce{\mathit{p}\text{-}BrC6H4OH + \mathit{o}\text{-}BrC6H4OH}$`],
  [r`$\ce{C6H5OH ->[\text{dil.}~HNO3] \mathit{o}\text{-}O2NC6H4OH + \mathit{p}\text{-}O2NC6H4OH}$`, r`$\ce{C6H5OH ->[\text{dil.}~HNO3]}$
$\ce{\mathit{o}\text{-}O2NC6H4OH + \mathit{p}\text{-}O2NC6H4OH}$`],
  [r`$\ce{R-CHO + 2Cu^{2+} + 5OH^- -> RCOO^- + Cu2O v + 3H2O}$`, r`$\ce{R-CHO + 2Cu^{2+} + 5OH^-}$
$\ce{-> RCOO^- + Cu2O v + 3H2O}$`],
  [r`$k = \dfrac{2.303}{t_{1/2}}\log\dfrac{[R]_0}{[R]_0/2} = \dfrac{2.303}{t_{1/2}}\log 2 = \dfrac{2.303 \times 0.3010}{t_{1/2}}$`, r`$k = \dfrac{2.303}{t_{1/2}}\log\dfrac{[R]_0}{[R]_0/2} = \dfrac{2.303}{t_{1/2}}\log 2$
$k = \dfrac{2.303 \times 0.3010}{t_{1/2}}$`],
]

// Every Part B answer of the paper as it should now read.
import { ANSWERS } from './chem-2024-main.mjs'
import { NCERT_ANSWERS } from './chem-2024-ncert7.mjs'
export const BEFORE = { ...ANSWERS, ...NCERT_ANSWERS }
export const AFTER = Object.fromEntries(Object.entries(BEFORE).map(([q, t]) => [q, SPLITS.reduce((s, [a, b]) => s.split(a).join(b), t)]))
export const unused = SPLITS.filter(([a]) => !Object.values(BEFORE).some(t => t.includes(a))).map(([a]) => a)
