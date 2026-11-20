// Ch 3 Chemical Kinetics. Model answers in NCERT wording (lech103, Rationalised 2023-24).
// Key: <year><M main | S supplementary>-<Part B question number>.
const r = String.raw

const ZERO_DERIVE = r`Zero order reaction: the rate is proportional to the zero power of the concentration of reactants. For $\ce{R -> P}$:
$\text{Rate} = -\dfrac{d[R]}{dt} = k[R]^0 = k$
$d[R] = -k\,dt$
Integrating both sides:
$[R] = -kt + I$ ...(1)
($I$ = constant of integration)
At $t = 0$, $[R] = [R]_0$, so $I = [R]_0$
Putting in (1):
$[R] = -kt + [R]_0$ ...(2)
$k = \dfrac{[R]_0 - [R]}{t}$
A plot of $[R]$ against $t$ is a straight line with slope $= -k$ and intercept $= [R]_0$.`

const ZERO_HALF = r`Half-life: at $t = t_{1/2}$, $[R] = \dfrac{[R]_0}{2}$
$k = \dfrac{[R]_0 - [R]_0/2}{t_{1/2}}$
$t_{1/2} = \dfrac{[R]_0}{2k}$
For a zero order reaction $t_{1/2}$ is directly proportional to the initial concentration.
Examples: decomposition of gaseous $\ce{NH3}$ on hot platinum at high pressure; some enzyme catalysed reactions.`

const FIRST_DERIVE = r`For a first order reaction $\ce{R -> P}$:
$\text{Rate} = -\dfrac{d[R]}{dt} = k[R]$
$\dfrac{d[R]}{[R]} = -k\,dt$
Integrating: $\ln[R] = -kt + I$
At $t = 0$, $[R] = [R]_0$, so $I = \ln[R]_0$
$\ln[R] = -kt + \ln[R]_0$
$\ln\dfrac{[R]_0}{[R]} = kt$
$k = \dfrac{2.303}{t}\log\dfrac{[R]_0}{[R]}$ ...(1)`

const FIRST_HALF = r`Half-life: at $t = t_{1/2}$, $[R] = \dfrac{[R]_0}{2}$. From (1):
$k = \dfrac{2.303}{t_{1/2}}\log\dfrac{[R]_0}{[R]_0/2} = \dfrac{2.303}{t_{1/2}}\log 2$
$t_{1/2} = \dfrac{2.303 \times 0.3010}{k}$
$t_{1/2} = \dfrac{0.693}{k}$`

const H2O2 = r`Arrhenius equation: $\log k = \log A - \dfrac{E_a}{2.303RT}$
Comparing with $\log k = 14.34 - \dfrac{1.25 \times 10^4\ \text{K}}{T}$:
$\dfrac{E_a}{2.303R} = 1.25 \times 10^4$ K
$E_a = 1.25 \times 10^4 \times 2.303 \times 8.314$
$E_a = 239339$ J mol⁻¹ $= 239.3$ kJ mol⁻¹

Half-period 256 min $= 256 \times 60 = 15360$ s
$k = \dfrac{0.693}{t_{1/2}} = \dfrac{0.693}{15360} = 4.51 \times 10^{-5}$ s⁻¹
$\log(4.51 \times 10^{-5}) = -4.346$
$-4.346 = 14.34 - \dfrac{1.25 \times 10^4}{T}$
$\dfrac{1.25 \times 10^4}{T} = 18.686$
$T = 669$ K`

const TEN_25 = r`For a first order reaction, $t = \dfrac{2.303}{k}\log\dfrac{[R]_0}{[R]}$

At 298 K, 10% completion: $t = \dfrac{2.303}{k_{298}}\log\dfrac{100}{90}$
At 308 K, 25% completion: $t = \dfrac{2.303}{k_{308}}\log\dfrac{100}{75}$
The times are equal:
$\dfrac{k_{308}}{k_{298}} = \dfrac{\log(4/3)}{\log(10/9)} = \dfrac{0.1249}{0.0458} = 2.73$

Arrhenius equation:
$\log\dfrac{k_2}{k_1} = \dfrac{E_a}{2.303R}\left(\dfrac{T_2 - T_1}{T_1T_2}\right)$
$\log 2.73 = \dfrac{E_a}{2.303 \times 8.314}\left(\dfrac{10}{298 \times 308}\right)$
$0.4362 = \dfrac{E_a \times 10}{19.147 \times 91784}$
$E_a = 76640$ J mol⁻¹ $= 76.64$ kJ mol⁻¹`

const SR90 = years => {
  const out = years.map(t => {
    const x = Math.pow(10, -0.02466 * t / 2.303)
    return r`After ${t} years:
$\log\dfrac{[R]_0}{[R]} = \dfrac{kt}{2.303} = \dfrac{0.02466 \times ${t}}{2.303} = ${(0.02466 * t / 2.303).toFixed(4)}$
$[R] = \dfrac{1}{\text{antilog}(${(0.02466 * t / 2.303).toFixed(4)})} = ${x.toFixed(4)}$ μg`
  })
  return r`Radioactive decay follows first order kinetics.
$k = \dfrac{0.693}{t_{1/2}} = \dfrac{0.693}{28.1} = 0.02466$ y⁻¹
$[R]_0 = 1$ μg

${out.join('\n\n')}`
}

const PSEUDO = r`Pseudo first order reaction: a reaction which is actually of higher order but behaves as a first order reaction, because one reactant is present in large excess so its concentration hardly changes.

Example: acid hydrolysis of ethyl acetate.
$\ce{CH3COOC2H5 + H2O}$
$\ce{->[H^+] CH3COOH + C2H5OH}$
It is really second order, but water is taken in large excess. For 0.01 mol ethyl acetate with 10 mol water, water changes only from 10 to 9.99 mol. So the rate depends only on [ethyl acetate]:
Rate $= k'[\ce{CH3COOC2H5}][\ce{H2O}]$
$= k[\ce{CH3COOC2H5}]$, where $k = k'[\ce{H2O}]$

Inversion of cane sugar is another example:
$\ce{C12H22O11 + H2O ->[H^+] C6H12O6 + C6H12O6}$
(glucose + fructose)`

const CATALYST_HOW = r`A catalyst is a substance which increases the rate of a reaction without itself undergoing any permanent chemical change, e.g. $\ce{MnO2}$ in $\ce{2KClO3 -> 2KCl + 3O2}$.

Intermediate complex theory: the catalyst forms temporary bonds with the reactants, giving an intermediate complex. This has a transitory existence and decomposes to give the products and the catalyst.
The catalyst provides an alternate pathway (reaction mechanism) with lower activation energy, so the potential energy barrier is lowered. By the Arrhenius equation, lower $E_a$ means a faster reaction.`

export const ANSWERS = {
  '2025M-2': r`For a first order reaction:
$k = \dfrac{2.303}{t}\log\dfrac{[R]_0}{[R]}$
At $t = t_{1/2}$, $[R] = \dfrac{[R]_0}{2}$:
$k = \dfrac{2.303}{t_{1/2}}\log\dfrac{[R]_0}{[R]_0/2} = \dfrac{2.303}{t_{1/2}}\log 2$
$t_{1/2} = \dfrac{0.693}{k}$
The term $[R]_0$ cancels, so for a first order reaction the half-life is constant, independent of the initial concentration of the reacting species. It depends only on $k$.`,

  '2025M-15': r`Given: $k_1 = 1.60 \times 10^{-5}$ s⁻¹ at $T_1 = 600$ K, $T_2 = 700$ K, $E_a = 209$ kJ mol⁻¹ $= 209000$ J mol⁻¹

$\log\dfrac{k_2}{k_1} = \dfrac{E_a}{2.303R}\left(\dfrac{1}{T_1} - \dfrac{1}{T_2}\right)$
$\log\dfrac{k_2}{k_1} = \dfrac{209000}{2.303 \times 8.314}\left(\dfrac{1}{600} - \dfrac{1}{700}\right)$
$\log\dfrac{k_2}{k_1} = 10915.6 \times 2.381 \times 10^{-4} = 2.599$
$\dfrac{k_2}{k_1} = \text{antilog}(2.599) = 397$
$k_2 = 397 \times 1.60 \times 10^{-5}$
$k_2 = 6.35 \times 10^{-3}$ s⁻¹`,

  '2025M-24': r`$\ce{SO2Cl2(g) -> SO2(g) + Cl2(g)}$
At $t = 0$: $p_0$, 0, 0. At time $t$: $p_0 - x$, $x$, $x$
$p_t = p_0 + x$, so $x = p_t - p_0$
$p_{\ce{SO2Cl2}} = p_0 - x = 2p_0 - p_t$

Rate constant (from $t = 100$ s, $p_t = 0.6$ atm):
$k = \dfrac{2.303}{t}\log\dfrac{p_0}{2p_0 - p_t}$
$k = \dfrac{2.303}{100}\log\dfrac{0.5}{1.0 - 0.6} = \dfrac{2.303}{100}\log 1.25$
$k = 2.23 \times 10^{-3}$ s⁻¹

When total pressure is 0.65 atm:
$p_{\ce{SO2Cl2}} = 2p_0 - p_t = 1.0 - 0.65 = 0.35$ atm
Rate $= k \times p_{\ce{SO2Cl2}}$
$= 2.23 \times 10^{-3} \times 0.35$
Rate $= 7.8 \times 10^{-4}$ atm s⁻¹`,

  '2025S-2': r`(i) Differential rate equation:
$\text{Rate} = -\dfrac{d[A]}{dt} = k[A][B]^2$

(ii) If both [A] and [B] are doubled:
Rate′ $= k(2[A])(2[B])^2 = 8\,k[A][B]^2$
The rate becomes 8 times.`,

  '2025S-15': r`(i) ${CATALYST_HOW}

(ii) Characteristics of a catalyst (any 4):
(1) A small amount of catalyst can catalyse a large amount of reactants.
(2) It does not alter the Gibbs energy, $\Delta G$, of a reaction.
(3) It catalyses spontaneous reactions but not non-spontaneous reactions.
(4) It does not change the equilibrium constant; it helps to attain equilibrium faster by catalysing forward and backward reactions to the same extent.
(5) It remains chemically unchanged at the end of the reaction.`,

  '2025S-24': H2O2,
  '2022M-27': H2O2,

  '2024S-2': PSEUDO,
  '2026M-5': PSEUDO,

  '2024S-15': ZERO_DERIVE + '\n\n' + ZERO_HALF,
  '2022M-14': ZERO_DERIVE + '\n\n' + ZERO_HALF,
  '2023S-15': ZERO_DERIVE + r`

Zero order reactions are uncommon; examples are some enzyme catalysed reactions and the decomposition of gaseous $\ce{NH3}$ on a hot platinum surface at high pressure:
$\ce{2NH3(g) ->[Pt] N2(g) + 3H2(g)}$`,

  '2024S-24': TEN_25,
  '2026M-24': TEN_25 + r`

Rate constant at 318 K ($A = 4 \times 10^{10}$ s⁻¹):
$\log k = \log A - \dfrac{E_a}{2.303RT}$
$\log k = \log(4 \times 10^{10}) - \dfrac{76640}{2.303 \times 8.314 \times 318}$
$\log k = 10.602 - 12.587 = -1.985$
$k = \text{antilog}(-1.985) = 1.04 \times 10^{-2}$ s⁻¹`,

  '2023M-1': CATALYST_HOW + r`

Graph (potential energy vs reaction coordinate): the reactants and products are at the same levels in both paths. The peak of the catalysed path is lower than the peak of the uncatalysed path, so $E_a$ (catalysed) < $E_a$ (uncatalysed). $\Delta H$ of the reaction is the same for both paths.
A catalyst does not change $\Delta G$ or the equilibrium constant; it only helps equilibrium to be reached faster.`,

  '2023M-14': r`$\ce{2N2O5(g) -> 2N2O4(g) + O2(g)}$
At $t = 0$: $p_0$, 0, 0. At time $t$: $p_0 - 2x$, $2x$, $x$
$p_t = p_0 - 2x + 2x + x = p_0 + x$
$x = p_t - p_0$
$p_{\ce{N2O5}} = p_0 - 2x = p_0 - 2(p_t - p_0)$
$p_{\ce{N2O5}} = 3p_0 - 2p_t$

At $t = 100$ s, $p_t = 0.512$ atm:
$p_{\ce{N2O5}} = 3(0.5) - 2(0.512) = 0.476$ atm

$k = \dfrac{2.303}{t}\log\dfrac{p_0}{p_{\ce{N2O5}}}$
$k = \dfrac{2.303}{100}\log\dfrac{0.5}{0.476}$
$k = \dfrac{2.303}{100} \times 0.0214$
$k = 4.92 \times 10^{-4}$ s⁻¹`,

  '2023S-7': r`$\log\dfrac{k_2}{k_1} = \dfrac{E_a}{2.303R}\left(\dfrac{T_2 - T_1}{T_1T_2}\right)$
$\log\dfrac{0.07}{0.02} = \dfrac{E_a \times 200}{2.303 \times 8.314 \times 500 \times 700}$
$E_a = \dfrac{0.5441 \times 2.303 \times 8.314 \times 350000}{200}$
$E_a = 18231$ J mol⁻¹ $= 18.23$ kJ mol⁻¹`,

  '2023S-16': SR90([10]),
  '2021M-23': SR90([10, 60]),

  '2022M-3': r`Order of reaction | Molecularity
(i) It is the sum of powers of the concentration terms in the rate law expression. | It is the number of reacting species (atoms, ions or molecules) taking part in an elementary reaction which must collide simultaneously.
(ii) It is an experimental quantity; it can be zero or even a fraction. | It cannot be zero or a non-integer.
(iii) It is applicable to elementary as well as complex reactions. | It is applicable only to elementary reactions; for complex reactions molecularity has no meaning.`,

  '2022S-3': r`Rate quadruples: $\dfrac{k_2}{k_1} = 4$, $T_1 = 293$ K, $T_2 = 313$ K

$\log\dfrac{k_2}{k_1} = \dfrac{E_a}{2.303R}\left(\dfrac{T_2 - T_1}{T_1T_2}\right)$
$\log 4 = \dfrac{E_a}{2.303 \times 8.314}\left(\dfrac{20}{293 \times 313}\right)$
$E_a = \dfrac{0.602 \times 2.303 \times 8.314 \times 293 \times 313}{20}$
$E_a = 52860$ J mol⁻¹ $= 52.86$ kJ mol⁻¹`,

  '2022S-14': r`Radioactive decay is a first order process.
$k = \dfrac{0.693}{t_{1/2}} = \dfrac{0.693}{5730}$ y⁻¹

The sample has 80% of the $\ce{^{14}C}$ of living wood: $[R] = 0.80[R]_0$
$t = \dfrac{2.303}{k}\log\dfrac{[R]_0}{[R]}$
$t = \dfrac{2.303 \times 5730}{0.693}\log\dfrac{100}{80}$
$t = 19042 \times 0.0969$
$t = 1845$ years

The sample is about 1845 years old.`,

  '2022S-27': r`Half-life of a reaction: the time in which the concentration of a reactant is reduced to one half of its initial concentration. It is represented as $t_{1/2}$.

Zero order reaction:
$k = \dfrac{[R]_0 - [R]}{t}$
At $t = t_{1/2}$, $[R] = \dfrac{[R]_0}{2}$:
$k = \dfrac{[R]_0 - [R]_0/2}{t_{1/2}}$
$t_{1/2} = \dfrac{[R]_0}{2k}$
($t_{1/2}$ is directly proportional to $[R]_0$)

First order reaction:
$k = \dfrac{2.303}{t}\log\dfrac{[R]_0}{[R]}$
At $t = t_{1/2}$, $[R] = \dfrac{[R]_0}{2}$:
$k = \dfrac{2.303}{t_{1/2}}\log 2$
$t_{1/2} = \dfrac{0.693}{k}$
($t_{1/2}$ is independent of $[R]_0$)`,

  '2021M-3': r`For $\ce{2A -> Products}$:
Rate $= -\dfrac{1}{2}\dfrac{\Delta[A]}{\Delta t}$
$= -\dfrac{1}{2} \times \dfrac{(0.4 - 0.5)\ \text{mol L}^{-1}}{10\ \text{min}}$
$= -\dfrac{1}{2} \times \dfrac{-0.1}{10}$
Rate $= 5 \times 10^{-3}$ mol L⁻¹ min⁻¹`,

  '2020M-1': r`30% decomposed, so $[R] = 70$ when $[R]_0 = 100$, $t = 40$ min
$k = \dfrac{2.303}{t}\log\dfrac{[R]_0}{[R]}$
$k = \dfrac{2.303}{40}\log\dfrac{100}{70}$
$k = 0.05758 \times 0.1549 = 8.918 \times 10^{-3}$ min⁻¹

$t_{1/2} = \dfrac{0.693}{k} = \dfrac{0.693}{8.918 \times 10^{-3}}$
$t_{1/2} = 77.7$ min`,

  '2020M-14': r`Let rate $= k[A]^x[B]^y$

Experiments I and IV ([B] same = 0.1 M):
$\dfrac{\text{Rate}_{IV}}{\text{Rate}_{I}} = \dfrac{2.40 \times 10^{-2}}{6.0 \times 10^{-3}} = 4 = \left(\dfrac{0.4}{0.1}\right)^x = 4^x$
So $x = 1$

Experiments I and II:
$\dfrac{7.2 \times 10^{-2}}{6.0 \times 10^{-3}} = 12$
$12 = \left(\dfrac{0.3}{0.1}\right)^1\left(\dfrac{0.2}{0.1}\right)^y = 3 \times 2^y$
$2^y = 4$, so $y = 2$

Rate law: Rate $= k[A][B]^2$ (overall order 3)

Rate constant from experiment I:
$k = \dfrac{\text{Rate}}{[A][B]^2} = \dfrac{6.0 \times 10^{-3}}{(0.1)(0.1)^2}$
$k = 6.0$ L² mol⁻² min⁻¹

(In the NCERT data the rate in experiment III is $2.88 \times 10^{-1}$; with this rate law $6.0 \times 0.3 \times (0.4)^2 = 0.288$.)`,

  '2026M-15': FIRST_DERIVE + '\n\n' + FIRST_HALF + r`

So the half-life of a first order reaction is independent of the initial concentration.`,
}
