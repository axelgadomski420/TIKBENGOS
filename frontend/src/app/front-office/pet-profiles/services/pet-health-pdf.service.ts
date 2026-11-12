import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { PetHealthRecord, PetProfile } from '../../../shared/models/pet-profile.model';

export interface PetHealthOwnerInfo {
  fullName: string;
}

@Injectable({
  providedIn: 'root'
})
export class PetHealthPdfService {
  async generateHealthCardPdf(
    pet: PetProfile,
    healthRecords: PetHealthRecord[],
    ownerInfo: PetHealthOwnerInfo
  ): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;

    const primaryColor: [number, number, number] = [16, 118, 110];
    const primaryDark: [number, number, number] = [12, 74, 110];
    const accentColor: [number, number, number] = [234, 88, 12];
    const panelSoft: [number, number, number] = [243, 250, 249];
    const textColor: [number, number, number] = [17, 24, 39];
    const mutedColor: [number, number, number] = [100, 116, 139];

    const vaccinationKeywordPattern = /(vaccin|vaccine|rabies|booster|immun)/i;
    const vaccinationRecords = healthRecords.filter((record) => {
      const composite = `${record.visitType || ''} ${record.diagnosis || ''} ${record.treatment || ''} ${record.medications || ''} ${record.vaccinationHistory || ''} ${record.notes || ''}`;
      return vaccinationKeywordPattern.test(composite);
    });
    const latestVaccination = vaccinationRecords.length ? vaccinationRecords[0] : null;
    const upcomingVaccination = vaccinationRecords.find((record) => {
      if (!record.nextVisitDate) {
        return false;
      }
      return new Date(record.nextVisitDate).getTime() >= this.startOfToday();
    });

    const ensurePageBreak = (y: number, requiredSpace: number): number => {
      if (y + requiredSpace <= 278) {
        return y;
      }
      doc.addPage();
      drawHeaderStrip();
      return 28;
    };

    const drawLabelValue = (label: string, value: string, x: number, y: number, width: number): number => {
      doc.setFontSize(7.8);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(label, x, y);
      doc.setFontSize(10.6);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const lines = doc.splitTextToSize(value || 'N/A', width);
      doc.text(lines, x, y + 4.8);
      return y + 4.8 + (lines.length * 4.8);
    };

    const drawMetricTile = (title: string, value: string, x: number, y: number, width: number): void => {
      doc.setFillColor(panelSoft[0], panelSoft[1], panelSoft[2]);
      doc.roundedRect(x, y, width, 15, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(title, x + 3, y + 5.4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(value, x + 3, y + 11.2);
    };

    const measureFieldHeight = (value: string, width: number): number => {
      const lines = doc.splitTextToSize(value || 'N/A', width);
      return Math.max(8, 4.6 + lines.length * 4.4);
    };

    const drawMedicalPair = (
      leftLabel: string,
      leftValue: string,
      rightLabel: string,
      rightValue: string,
      y: number
    ): number => {
      const pairGap = 4;
      const pairWidth = (contentWidth - pairGap) / 2;
      const leftHeight = measureFieldHeight(leftValue, pairWidth - 6) + 8;
      const rightHeight = measureFieldHeight(rightValue, pairWidth - 6) + 8;
      const cardHeight = Math.max(leftHeight, rightHeight);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, y, contentWidth, cardHeight, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(leftLabel, marginX + 3, y + 5.2);
      doc.text(rightLabel, marginX + pairWidth + pairGap + 3, y + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.3);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const leftLines = doc.splitTextToSize(leftValue || 'N/A', pairWidth - 6);
      const rightLines = doc.splitTextToSize(rightValue || 'N/A', pairWidth - 6);
      doc.text(leftLines, marginX + 3, y + 10);
      doc.text(rightLines, marginX + pairWidth + pairGap + 3, y + 10);

      return y + cardHeight + 3;
    };

    const drawVaccinationCard = (record: PetHealthRecord, index: number, y: number): number => {
      const leftHeight = measureFieldHeight(record.vaccinationHistory || 'N/A', contentWidth - 22);
      const cardHeight = Math.max(26, 20 + leftHeight);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, y, contentWidth, cardHeight, 2, 2, 'F');

      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(marginX + 2, y + 2, 10, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(String(index + 1), marginX + 7, y + 8.8, { align: 'center' });

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(record.visitType || 'Vaccination', marginX + 16, y + 8.4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(`Date: ${new Date(record.recordDate).toLocaleDateString()}`, marginX + 16, y + 13.2);
      doc.text(`Clinic: ${record.clinicName || 'N/A'}`, marginX + 16, y + 17.6);

      const details = [record.vaccinationHistory, record.nextVisitDate ? `Next dose: ${new Date(record.nextVisitDate).toLocaleDateString()}` : null]
        .filter(Boolean)
        .join(' • ');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(doc.splitTextToSize(details || 'No vaccination details provided.', contentWidth - 22), marginX + 16, y + 22.2);

      return y + cardHeight + 3;
    };

    const drawHeaderStrip = (): void => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
      doc.rect(0, 24, pageWidth, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16.5);
      doc.setTextColor(255, 255, 255);
      doc.text('ELIF PET HEALTH RECORD', marginX, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, marginX, 20.2);
    };

    drawHeaderStrip();

    // Best-effort photo embedding for a richer clinical card export.
    const photoDataUrl = await this.toImageDataUrl(pet.photoUrl);
    if (photoDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - 45, 35, 29, 29, 2, 2, 'F');
      doc.addImage(photoDataUrl, 'JPEG', pageWidth - 44, 36, 27, 27);
    }

    let cursorY = 36;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15.2);
    doc.text(pet.name, marginX, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`${pet.species} • ${pet.breed || 'Breed not specified'} • ${pet.gender}`, marginX, cursorY + 6);

    doc.setFillColor(panelSoft[0], panelSoft[1], panelSoft[2]);
    doc.roundedRect(marginX, cursorY + 9, contentWidth - 36, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Guardian', marginX + 3, cursorY + 13.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.3);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(ownerInfo.fullName || 'Pet Owner', marginX + 3, cursorY + 18);

    cursorY = 66;

    const tileWidth = (contentWidth - 9) / 4;
    drawMetricTile('Status', healthRecords.length ? 'ACTIVE FILE' : 'NO RECORDS', marginX, cursorY, tileWidth);
    drawMetricTile('Total Records', String(healthRecords.length), marginX + tileWidth + 3, cursorY, tileWidth);
    drawMetricTile('Upcoming Visits', String(this.countUpcomingVisits(healthRecords)), marginX + (tileWidth + 3) * 2, cursorY, tileWidth);
    drawMetricTile(
      'Last Check',
      healthRecords[0] ? new Date(healthRecords[0].recordDate).toLocaleDateString() : 'N/A',
      marginX + (tileWidth + 3) * 3,
      cursorY,
      tileWidth
    );
    cursorY += 26;

    const leftColumnX = marginX;
    const rightColumnX = marginX + contentWidth / 2 + 6;
    const columnWidth = contentWidth / 2 - 6;

    cursorY = drawLabelValue('Age', pet.ageDisplay || 'Unknown', leftColumnX, cursorY, columnWidth);
    cursorY = drawLabelValue('Weight', pet.weight !== null && pet.weight !== undefined ? `${pet.weight} kg` : 'Unknown', leftColumnX, cursorY + 4, columnWidth);
    cursorY = drawLabelValue('Date of Birth', pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString() : 'Unknown', leftColumnX, cursorY + 4, columnWidth);

    let healthColumnY = 92;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Clinical Summary', rightColumnX, healthColumnY);

    healthColumnY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const status = healthRecords.length ? 'Complete health history available' : 'No health records yet';
    doc.text(`Status: ${status}`, rightColumnX, healthColumnY);
    doc.text(`Total records: ${healthRecords.length}`, rightColumnX, healthColumnY + 6);

    const upcomingVisits = this.countUpcomingVisits(healthRecords);
    doc.text(`Upcoming visits: ${upcomingVisits}`, rightColumnX, healthColumnY + 12);

    const latestRecord = healthRecords[0];
    if (latestRecord) {
      const latestDate = new Date(latestRecord.recordDate).toLocaleDateString();
      doc.text(`Last check: ${latestDate}`, rightColumnX, healthColumnY + 18);
    }

    healthColumnY += 28;
    doc.setFillColor(255, 247, 237);
    doc.roundedRect(rightColumnX - 1.5, healthColumnY - 4, columnWidth + 2, 30, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('Vaccination Snapshot', rightColumnX, healthColumnY + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Vaccination records: ${vaccinationRecords.length}`, rightColumnX, healthColumnY + 7);
    doc.text(
      `Last vaccination: ${latestVaccination ? new Date(latestVaccination.recordDate).toLocaleDateString() : 'Not recorded'}`,
      rightColumnX,
      healthColumnY + 12
    );
    doc.text(
      `Next vaccination: ${upcomingVaccination?.nextVisitDate ? new Date(upcomingVaccination.nextVisitDate).toLocaleDateString() : 'Not scheduled'}`,
      rightColumnX,
      healthColumnY + 17
    );
    doc.text(
      `Coverage ratio: ${healthRecords.length ? Math.round((vaccinationRecords.length / healthRecords.length) * 100) : 0}%`,
      rightColumnX,
      healthColumnY + 22
    );

    cursorY = Math.max(cursorY, healthColumnY + 31);
    cursorY = ensurePageBreak(cursorY, 50);
    cursorY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Medical Profile', marginX, cursorY);
    cursorY += 6;

    if (latestRecord) {
      cursorY = drawMedicalPair('Blood Type', latestRecord.bloodType || 'N/A', 'Spayed / Neutered', latestRecord.spayedNeutered || 'N/A', cursorY);
      cursorY = drawMedicalPair('Allergies', latestRecord.allergies || 'N/A', 'Chronic Conditions', latestRecord.chronicConditions || 'N/A', cursorY);
      cursorY = drawMedicalPair('Previous Operations', latestRecord.previousOperations || 'N/A', 'Vaccination History', latestRecord.vaccinationHistory || 'N/A', cursorY);
      cursorY = drawMedicalPair('Special Diet', latestRecord.specialDiet || 'N/A', 'Parasite Prevention', latestRecord.parasitePrevention || 'N/A', cursorY);
      cursorY = drawMedicalPair('Emergency Instructions', latestRecord.emergencyInstructions || 'N/A', 'Current Medications', latestRecord.medications || 'N/A', cursorY);
      cursorY += 4;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text('No detailed medical profile recorded yet.', marginX, cursorY + 5);
      cursorY += 12;
    }

    cursorY = ensurePageBreak(cursorY, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Vaccination Timeline', marginX, cursorY);
    cursorY += 6;

    if (!vaccinationRecords.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text('No vaccination-focused records found yet.', marginX, cursorY + 5);
      cursorY += 12;
    } else {
      vaccinationRecords.forEach((record, index) => {
        cursorY = ensurePageBreak(cursorY, 24);
        cursorY = drawVaccinationCard(record, index, cursorY);
      });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Medical Event Timeline', marginX, cursorY);
    cursorY += 6;

    if (!healthRecords.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text('No health records have been added yet.', marginX, cursorY + 5);
    } else {
      healthRecords.forEach((record, index) => {
        const detailText = [record.clinicName, record.diagnosis, record.treatment, record.medications, record.allergies, record.chronicConditions]
          .filter(Boolean)
          .join(' • ');
        const splitDetail = doc.splitTextToSize(detailText || 'No extra details provided.', contentWidth - 20);
        const boxHeight = Math.max(30, 18 + splitDetail.length * 4.5);

        cursorY = ensurePageBreak(cursorY, boxHeight + 8);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 2, 2, 'F');

        const composite = `${record.visitType || ''} ${record.diagnosis || ''} ${record.treatment || ''} ${record.medications || ''}`;
        const isVaccination = vaccinationKeywordPattern.test(composite);
        doc.setFillColor(isVaccination ? accentColor[0] : primaryColor[0], isVaccination ? accentColor[1] : primaryColor[1], isVaccination ? accentColor[2] : primaryColor[2]);
        doc.rect(marginX, cursorY, 3.2, boxHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.3);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(`${index + 1}. ${record.visitType}`, marginX + 6, cursorY + 7.6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(`Date: ${new Date(record.recordDate).toLocaleDateString()}`, marginX + 6, cursorY + 13.2);
        doc.text(`Vet: ${record.veterinarian || 'N/A'}`, marginX + 6, cursorY + 18);
        if (record.nextVisitDate) {
          doc.text(`Next visit: ${new Date(record.nextVisitDate).toLocaleDateString()}`, marginX + contentWidth - 55, cursorY + 18);
        }
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(splitDetail, marginX + 6, cursorY + 24);

        cursorY += boxHeight + 5;
      });
    }

    cursorY = ensurePageBreak(cursorY, 28);
    doc.setFillColor(panelSoft[0], panelSoft[1], panelSoft[2]);
    doc.roundedRect(marginX, cursorY, contentWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Veterinary Validation', marginX + 4, cursorY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('This summary is generated from the latest records in PURRE PETS.', marginX + 4, cursorY + 12.5);

    const footerY = 285;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('PURRE PETS • Medical export generated for continuity of care', pageWidth / 2, footerY, { align: 'center' });

    const fileName = `pet-health-card-${pet.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'pet'}-${Date.now()}.pdf`;
    doc.save(fileName);
  }

  private countUpcomingVisits(records: PetHealthRecord[]): number {
    return records.filter((record) => {
      if (!record.nextVisitDate) {
        return false;
      }
      return new Date(record.nextVisitDate).getTime() >= this.startOfToday();
    }).length;
  }

  private async toImageDataUrl(sourceUrl: string | null | undefined): Promise<string | null> {
    if (!sourceUrl) {
      return null;
    }

    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private startOfToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }
}
