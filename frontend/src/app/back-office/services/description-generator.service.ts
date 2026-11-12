import { Injectable } from '@angular/core';

export type ServiceCategory = 'VETERINARY' | 'GROOMING' | 'TRAINING' | 'BOARDING' | 'HOTEL' | 'WALKING' | string;

@Injectable({ providedIn: 'root' })
export class DescriptionGeneratorService {

  generate(name: string, category: ServiceCategory): string {
    const cat = (category || '').toUpperCase();
    const cleanName = (name || 'Ce service').trim();

    switch (cat) {
      case 'VETERINARY':
        return `${cleanName} est un service vétérinaire professionnel conçu pour assurer la santé et le bien-être de votre animal. `
          + `Notre équipe de vétérinaires qualifiés effectue un bilan complet, des diagnostics précis et un suivi personnalisé. `
          + `Votre compagnon bénéficie des meilleurs soins dans un environnement rassurant et adapté.`;

      case 'GROOMING':
        return `${cleanName} est une prestation de toilettage haut de gamme pour sublimer votre animal. `
          + `Nos toiletteurs expérimentés utilisent des produits de qualité professionnelle pour un pelage soyeux et brillant. `
          + `Shampoing, séchage, coupe et finitions soignées — votre compagnon repart radieux et parfumé.`;

      case 'TRAINING':
        return `${cleanName} est un programme d'éducation canine sur mesure, adapté au caractère et au niveau de votre chien. `
          + `Nos éducateurs certifiés utilisent des méthodes positives et bienveillantes pour développer l'obéissance, la confiance et la socialisation. `
          + `Des résultats concrets et durables pour une relation harmonieuse avec votre animal.`;

      case 'BOARDING':
        return `${cleanName} offre une garde sécurisée et chaleureuse pour votre animal en votre absence. `
          + `Votre compagnon est accueilli dans un environnement familial, avec sorties régulières, jeux et attention constante. `
          + `Vous pouvez partir serein, votre animal est entre de bonnes mains.`;

      case 'HOTEL':
        return `${cleanName} est un hébergement premium pour animaux, alliant confort et sécurité. `
          + `Chambres spacieuses, suivi en temps réel, repas adaptés et personnel attentionné 24h/24. `
          + `Un séjour 5 étoiles pour votre compagnon, avec toute la tranquillité d'esprit que vous méritez.`;

      case 'WALKING':
        return `${cleanName} est un service de promenade professionnel pour que votre chien profite de sorties enrichissantes au quotidien. `
          + `Nos promeneurs passionnés assurent des balades adaptées au rythme de votre animal, dans des espaces verts sûrs. `
          + `Exercice, socialisation et épanouissement garantis à chaque sortie.`;

      default:
        return `${cleanName} est une prestation professionnelle dédiée au bien-être de votre animal. `
          + `Notre équipe qualifiée vous garantit un service de qualité, adapté aux besoins de votre compagnon. `
          + `Faites confiance à notre expertise pour offrir le meilleur à votre animal.`;
    }
  }
}
