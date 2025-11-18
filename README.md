# 🌙 LunaScript  
**Le premier langage de programmation simple, lisible et 100% en français.**  
Open-source, rapide, pensé pour les débutants comme pour les créateurs.

---

## ✨ Présentation

LunaScript (LS) est un langage inspiré de la simplicité de Scratch et de la vitesse d’écriture de JavaScript,  
mais entièrement **en français** et conçu pour donner une syntaxe logique, claire et naturelle.

Il s’utilise directement dans une page web avec :

```
<script src="https://lunascript.onrender.com/cdn/ls.js"></script>
<script type="ls">
    msg("Bonjour du futur !")
</script>
```

---

## 🎯 Objectifs du langage

- 🧠 *Compréhension immédiate* — tout est écrit en français  
- ⚡ *Syntaxe rapide* — pas de bruit, pas de complexité  
- 🌍 *Exécutable partout* — via un interpréteur JavaScript léger  
- 🎨 *Éducatif & créatif* — parfait pour apprendre ou prototyper  
- 🔧 *Extensible* — API interne simple pour ajouter des fonctions

---

## 🧩 Syntaxe de base

### Variables
```
def nom = "Alberto67"
var compteur = 0
```

### Conditions
```
si (compteur > 5) {
    msg("OK")
} sinon {
    err("Erreur : trop petit")
}
```

### Boucles
```
repeter 5 {
    msg("Salut")
}
```

### Manipulation du document
```
doc.el("titre").texte = "Bienvenue"
doc.el("zone").ajouter("p", "Hello LS")
```

---

## 🚀 Intégration dans une page web

```
<script src="https://lunascript.onrender.com/cdn/ls.js"></script>

<script type="ls">
repeter 3 {
    msg("LunaScript est vivant !")
}
</script>
```

---

## 📦 Installation (via CDN)

```
<script src="https://lunascript.onrender.com/cdn/ls.js"></script>
```

Aucune configuration supplémentaire.

---

## 🧱 Architecture du projet

- `/cdn/ls.js` — le fichier qui vous permet d'utiliser LS
---

## 🤝 Contribution

Les contributions sont **les bienvenues** :  
corrections, amélioration du parser, idées de nouvelles fonctions LS…

Vous pouvez ouvrir :  
- une **issue**  
- une **pull request**  
- une **discussion**

---

## 📜 Licence

LunaScript est distribué sous licence **MIT**.  
Vous êtes libre de l’utiliser, le modifier et le redistribuer.

---

## 🌟 Auteur

**Alberto67** — créateur de LunaScript  
Projet ouvert dans un but éducatif, créatif et accessible.

---

## ⭐ Si vous aimez ce projet…

N’oubliez pas de mettre une **star** ⭐ sur GitHub !  
Ça aide énormément le projet et sa visibilité.
