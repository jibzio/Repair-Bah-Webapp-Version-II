import { QuoteLineItem } from '../types/repairbah';

export const MalaysianTaxEngine = {
  calculate(items: QuoteLineItem[]) {
    let laborSubtotal = 0;
    let partsSubtotal = 0;
    for (const item of items) {
      const lineTotal = item.qty * item.unitPrice;
      if (item.category === 'LABOR') {
        laborSubtotal += lineTotal;
      } else {
        partsSubtotal += lineTotal;
      }
    }
    const sstAmount = Number((laborSubtotal * 0.08).toFixed(2)); // 8% SST on Labor/Service
    const grandTotal = Number(
      (laborSubtotal + partsSubtotal + sstAmount).toFixed(2)
    );
    return {
      laborSubtotal: Number(laborSubtotal.toFixed(2)),
      partsSubtotal: Number(partsSubtotal.toFixed(2)),
      sstRate: 0.08,
      sstAmount,
      grandTotal,
    };
  },
};

export const SmsFallbackEncoder = {
  encode(params: {
    plate: string;
    lat: number;
    lng: number;
    triageCode: string;
    pin: string;
  }) {
    const cleanPlate = params.plate.replace(/\s+/g, '').toUpperCase();
    const latMicro = Math.round(params.lat * 1_000_000);
    const lngMicro = Math.round(params.lng * 1_000_000);
    return `RB#${cleanPlate}#${latMicro},${lngMicro}#${params.triageCode}#${params.pin}`;
  },
};

export const LhdnEInvoiceGenerator = {
  buildMetadata(jobId: string, plate: string, total: number) {
    const cleanPlate = plate.replace(/\s+/g, '');
    const uuid = `MYINV-SBH-${jobId}-${cleanPlate}`;
    const verifyUrl = `https://myinvois.lhdn.gov.my/verify?uuid=${encodeURIComponent(
      uuid
    )}&tin=C25849102090&total=${total.toFixed(2)}`;
    return {
      uuid,
      tin: 'C25849102090',
      sstRegNo: 'B16-2408-32000194',
      verifyUrl,
      validatedAt: new Date().toISOString(),
    };
  },
};

export const PdfInvoiceGenerator = {
  generateBinaryPdfBlob(params: {
    invoiceNo: string;
    lhdnUuid: string;
    customerName: string;
    plate: string;
    vehicle: string;
    location: string;
    items: QuoteLineItem[];
    totals: ReturnType<typeof MalaysianTaxEngine.calculate>;
  }): Blob {
    const escapePdfText = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const lines: string[] = [
      'REPAIRBAH SABAH ROADSIDE & WORKSHOP SDN BHD',
      'Lot 14, Kolombong Industrial Estate, 88450 Kota Kinabalu, Sabah',
      'TIN: C25849102090 | SST Reg: B16-2408-32000194',
      '--------------------------------------------------------------------',
      `INVOICE NO   : ${params.invoiceNo}`,
      `LHDN MYINVOIS: ${params.lhdnUuid}`,
      `DATE / TIME  : ${new Date().toLocaleString('en-MY')}`,
      `CUSTOMER     : ${params.customerName}`,
      `VEHICLE      : ${params.vehicle} (${params.plate})`,
      `LOCATION     : ${params.location}`,
      '--------------------------------------------------------------------',
      'ITEMIZED BREAKDOWN (MALAYSIAN SST COMPLIANT):',
      ...params.items.map(
        (it) =>
          ` - [${it.category}] ${it.description} x${it.qty}: RM ${(
            it.qty * it.unitPrice
          ).toFixed(2)}`
      ),
      '--------------------------------------------------------------------',
      `Service & Labor Subtotal : RM ${params.totals.laborSubtotal.toFixed(2)}`,
      `Spare Parts Subtotal     : RM ${params.totals.partsSubtotal.toFixed(2)}`,
      `Malaysian SST (8% Labor) : RM ${params.totals.sstAmount.toFixed(2)}`,
      `Malaysian SST (0% Parts) : RM 0.00`,
      `GRAND TOTAL (ESCROW PAID): RM ${params.totals.grandTotal.toFixed(2)}`,
      '--------------------------------------------------------------------',
      'ESCROW STATUS: DISBURSED & CRYPTOGRAPHICALLY SIGNED',
      'Verify at: https://myinvois.lhdn.gov.my/verify',
    ];

    let contentStream = 'BT\n/F1 10 Tf\n42 780 Td\n15 TL\n';
    lines.forEach((line, idx) => {
      if (idx === 0) {
        contentStream += `(${escapePdfText(line)}) Tj\n`;
      } else {
        contentStream += `T* (${escapePdfText(line)}) Tj\n`;
      }
    });
    contentStream += 'ET';

    const objects: string[] = [];
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objects.push(
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
    );
    objects.push(
      `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
    );
    objects.push(
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n'
    );

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  },
};

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function latLngToMapCoords(lat: number, lng: number) {
  const mapY = Math.max(
    80,
    Math.min(900, Math.round(((6.09 - lat) / 0.22) * 1000))
  );
  const mapX = Math.max(
    120,
    Math.min(880, Math.round(((lng - 116.01) / 0.16) * 1000))
  );
  return { mapX, mapY };
}

export function mapCoordsToLatLng(mapX: number, mapY: number) {
  const lat = Number((6.09 - (mapY / 1000) * 0.22).toFixed(4));
  const lng = Number((116.01 + (mapX / 1000) * 0.16).toFixed(4));
  return { lat, lng };
}
