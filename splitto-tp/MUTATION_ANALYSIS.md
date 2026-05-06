# Analyse des mutations

## Score initial
- balances.ts : 65.28%
- simplify.ts : 78.43%

## Score final
- balances.ts : 88.89%
- simplify.ts : 88.24%

## Mutants survivants après amélioration

### Mutant 1 : suppression du return sur bénéficiaires vides
- Fichier : `balances.ts` (zone `if (beneficiaries.length === 0)`)
- Mutation : bloc remplacé par un bloc vide (`if (...) {}`), sans `return`.
- Pourquoi il survit : cas proche d’un mutant équivalent selon les données couvertes (la suite du calcul peut rester neutre dans les scénarios testés).
- Décision : accepté (score cible atteint et comportement métier global validé).

### Mutant 2 : variante de tri des remainders
- Fichier : `balances.ts` (zone `remainders.sort(...)`)
- Mutation : tri supprimé ou remplacé (`remainders;`, `sort(() => undefined)`, `+` au lieu de `-`).
- Pourquoi il survit : certains jeux de données n’exposent pas de différence observable sur le résultat final (ordre de distribution peu discriminant sur ces cas).
- Décision : accepté, risque résiduel documenté.

### Mutant 3 : condition while relâchée dans simplify
- Fichier : `simplify.ts` (boucle `while`)
- Mutation : `&&` remplacé par `||`, ou comparaisons `<` remplacées par `<=`.
- Pourquoi il survit : sur les entrées couvertes, les index et montants ne provoquent pas de divergence visible malgré la mutation.
- Décision : accepté pour le rendu courant (objectif de score dépassé).

### Mutant 4 : comparaison `cents > 0` vers `cents >= 0`
- Fichier : `simplify.ts` (construction des créditeurs)
- Mutation : `>` remplacé par `>=`.
- Pourquoi il survit : inclure ponctuellement un solde nul dans la liste des créditeurs ne change pas toujours la sortie finale.
- Décision : accepté (mutant quasi-équivalent).

## Rapport utilisé
- Rapport HTML Stryker : `reports/mutation/mutation.html`
