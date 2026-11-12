import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfReportSection {
  title: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  note?: string;
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  fileBaseName?: string;
  sections: PdfReportSection[];
}

@Injectable({ providedIn: 'root' })
export class AdminExportService {
  exportExcel(
    fileBaseName: string,
    headers: string[],
    rows: Array<Array<string | number | boolean | null | undefined>>
  ): void {
    const lines = [
      headers.join('\t'),
      ...rows.map((row) => row.map((cell) => this.toTabCell(cell)).join('\t'))
    ];

    const content = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([content], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });

    this.downloadBlob(blob, `${this.slugify(fileBaseName)}.xls`);
  }

  exportPdf(
    title: string,
    headers: string[],
    rows: Array<Array<string | number | boolean | null | undefined>>,
    subtitle?: string
  ): void {
    this.exportStyledReport({
      title,
      subtitle,
      fileBaseName: title,
      sections: [{ title: 'Report Data', headers, rows }]
    });
  }

  exportStyledReport(options: PdfReportOptions): void {
    const orientation = this.computeOrientation(options.sections);
    const doc = new jsPDF({
      orientation,
      unit: 'pt',
      format: 'a4'
    });

    const margin = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;

    let y = this.drawReportHeader(doc, options.title, options.subtitle, margin, usableWidth);

    options.sections.forEach((section, index) => {
      if (y > pageHeight - 140) {
        doc.addPage();
        y = this.drawReportHeader(doc, options.title, undefined, margin, usableWidth, true);
      }

      y = this.drawSectionHeading(doc, section.title, section.note, margin, y, usableWidth);

      const bodyRows = section.rows.map((row) =>
        section.headers.map((_, colIndex) => this.toPdfCell(row[colIndex]))
      );

      const columnStyles = this.buildColumnStyles(section.headers, bodyRows, usableWidth);

      autoTable(doc, {
        startY: y,
        head: [section.headers.map((header) => this.toPdfCell(header))],
        body: bodyRows,
        theme: 'grid',
        margin: { left: margin, right: margin, top: margin + 62, bottom: margin + 18 },
        styles: {
          font: 'helvetica',
          fontSize: section.headers.length > 6 ? 7.5 : 8.5,
          textColor: [30, 41, 59],
          cellPadding: { top: 4.5, right: 5.5, bottom: 4.5, left: 5.5 },
          valign: 'top',
          overflow: 'linebreak',
          lineColor: [226, 232, 240],
          lineWidth: 0.45
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: section.headers.length > 6 ? 7.8 : 8.8,
          lineColor: [15, 118, 110]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles
      });

      const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
      y = (finalY || y) + (index < options.sections.length - 1 ? 18 : 10);
    });

    this.drawPageNumbers(doc, margin);
    doc.save(`${this.slugify(options.fileBaseName || options.title)}.pdf`);
  }

  private computeOrientation(sections: PdfReportSection[]): 'portrait' | 'landscape' {
    const maxColumnCount = Math.max(...sections.map((section) => section.headers.length), 1);
    return maxColumnCount > 5 ? 'landscape' : 'portrait';
  }

  private drawReportHeader(
    doc: jsPDF,
    title: string,
    subtitle: string | undefined,
    margin: number,
    usableWidth: number,
    compact = false
  ): number {
    const headerHeight = compact ? 44 : 62;

    doc.setFillColor(15, 118, 110);
    doc.roundedRect(margin, margin, usableWidth, headerHeight, 10, 10, 'F');

    doc.setFillColor(248, 154, 63);
    doc.roundedRect(margin + 12, margin + 10, compact ? 34 : 42, compact ? 8 : 10, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(compact ? 11 : 14);
    doc.text(title, margin + 12, margin + (compact ? 28 : 26));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(compact ? 7.8 : 8.7);
    doc.text(`Generated ${new Date().toLocaleString()}`, margin + 12, margin + (compact ? 38 : 40));

    if (!compact && subtitle) {
      doc.setTextColor(229, 244, 241);
      const subtitleLines = doc.splitTextToSize(subtitle, usableWidth - 24) as string[];
      doc.text(subtitleLines, margin + 12, margin + 52);
      return margin + headerHeight + subtitleLines.length * 9 + 10;
    }

    return margin + headerHeight + 12;
  }

  private drawSectionHeading(
    doc: jsPDF,
    title: string,
    note: string | undefined,
    margin: number,
    y: number,
    usableWidth: number
  ): number {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, usableWidth, 24, 6, 6, 'F');

    doc.setFillColor(248, 154, 63);
    doc.roundedRect(margin + 1, y + 1, 4, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin + 12, y + 16);

    let nextY = y + 30;
    if (note) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      const noteLines = doc.splitTextToSize(note, usableWidth) as string[];
      doc.text(noteLines, margin, nextY);
      nextY += noteLines.length * 10 + 4;
    }

    return nextY;
  }

  private buildColumnStyles(
    headers: string[],
    rows: string[][],
    usableWidth: number
  ): Record<number, { cellWidth: number }> {
    const columnCount = Math.max(headers.length, 1);
    const maxLengths = new Array(columnCount).fill(8);

    headers.forEach((header, index) => {
      maxLengths[index] = Math.max(maxLengths[index], this.toPdfCell(header).length);
    });

    rows.slice(0, 120).forEach((row) => {
      row.forEach((value, index) => {
        maxLengths[index] = Math.max(maxLengths[index], Math.min(value.length, 180));
      });
    });

    const weighted = maxLengths.map((length) => Math.max(1, Math.sqrt(length)));
    const totalWeight = weighted.reduce((sum, value) => sum + value, 0);
    const minimumWidth = columnCount > 7 ? 56 : 64;
    const initial = weighted.map((weight) => (weight / totalWeight) * usableWidth);
    const withMinimum = initial.map((width) => Math.max(minimumWidth, width));
    const scale = usableWidth / withMinimum.reduce((sum, value) => sum + value, 0);
    const normalized = withMinimum.map((value) => value * scale);

    const styles: Record<number, { cellWidth: number }> = {};
    normalized.forEach((width, index) => {
      styles[index] = { cellWidth: Number(width.toFixed(2)) };
    });

    return styles;
  }

  private drawPageNumbers(doc: jsPDF, margin: number): void {
    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.text('PURRE PETS Admin Export', margin, pageHeight - 10);
    }
  }

  private toTabCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/\t/g, ' ')
      .replace(/\r?\n/g, ' ')
      .trim();
  }

  private toPdfCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return String(value)
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '-';
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'export';
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
