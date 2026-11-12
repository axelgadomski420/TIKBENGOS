import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
    providedIn: 'root'
})
export class ContractPdfService {

    generateContractPdf(contract: any): void {
        const doc = new jsPDF();
        
        // En-tête
        doc.setFontSize(20);
        doc.setTextColor(58, 146, 130);
        doc.text('Adoption Contract', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        // Ligne de séparation
        doc.setDrawColor(58, 146, 130);
        doc.line(20, 35, 190, 35);
        
        // Informations du contrat
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Contract N°: ${contract.numeroContrat || 'N/A'}`, 20, 50);
        doc.text(`Animal: ${contract.animal?.name || 'N/A'}`, 20, 60);
        doc.text(`Shelter: ${contract.shelter?.name || 'N/A'}`, 20, 70);
        doc.text(`Adopter: ${contract.adoptant?.firstName || ''} ${contract.adoptant?.lastName || ''}`, 20, 80);
        doc.text(`Adoption Date: ${contract.dateAdoption || new Date().toLocaleDateString()}`, 20, 90);
        doc.text(`Adoption Fee: ${contract.fraisAdoption || 150} €`, 20, 100);
        
        // Conditions
        doc.setFontSize(14);
        doc.setTextColor(58, 146, 130);
        doc.text('Terms and Conditions', 20, 120);
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const conditions = contract.conditionsSpecifiques || 'Standard adoption conditions apply.';
        const splitConditions = doc.splitTextToSize(conditions, 170);
        doc.text(splitConditions, 20, 130);
        
        // Signatures
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Adopter Signature: ___________________', 20, 180);
        doc.text('Shelter Representative: ___________________', 120, 180);
        doc.text('Date: ___________________', 20, 190);
        doc.text('Date: ___________________', 120, 190);
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('PURRE PETS — official adoption contract', 105, 280, { align: 'center' });
        
        // Télécharger le PDF
        doc.save(`Adoption_Contract_${contract.numeroContrat || Date.now()}.pdf`);
    }
}