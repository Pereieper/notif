import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DocumentRequestService } from 'src/app/services/document-request.service';

@Component({
  selector: 'app-released-documents',
  templateUrl: './released-documents.page.html',
  styleUrls: ['./released-documents.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ReleasedDocumentsPage implements OnInit {
  releasedDocuments: any[] = [];
  paginatedDocuments: any[] = [];
  selectedDocument: any = null;
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;
  searchTerm = '';
  showModal = false;

  constructor(private requestService: DocumentRequestService) {}

  ngOnInit() { this.loadReleasedDocuments(); }

  async loadReleasedDocuments() {
    this.releasedDocuments = await this.requestService.getReleasedDocuments();
    this.paginateDocuments();
  }

  filterDocuments() {
    const term = this.searchTerm.toLowerCase();
    this.paginatedDocuments = this.releasedDocuments.filter(doc =>
      doc.documentType.toLowerCase().includes(term)
    );
    this.totalPages = Math.ceil(this.paginatedDocuments.length / this.itemsPerPage);
    this.currentPage = 1;
    this.paginateDocuments();
  }

  paginateDocuments() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedDocuments = this.releasedDocuments.slice(start, end);
  }

  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.paginateDocuments(); } }
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.paginateDocuments(); } }

  markAsReleased(document: any) {
    this.requestService.updateStatus(document.id, 'Released');
    alert('Document marked as released.');
    this.closeModal();
  }

  openInstructions(document: any) {
    this.selectedDocument = document;
    this.showModal = true;
  }

  closeModal() {
    this.selectedDocument = null;
    this.showModal = false;
  }
}
