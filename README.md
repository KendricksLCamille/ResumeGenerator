# ResumeGenerator

A custom resume generator to allow automatic resume generation and customization. This tool helps you create a professional resume with a live PDF preview, allowing you to fine-tune your details and export them in multiple formats.

### 🚀 Features

- **Live PDF Preview**: Real-time generation of your resume as you type, powered by `jsPDF`.
- **Comprehensive Resume Fields**:
    - **Personal Information**: Name, Email, Phone, and additional introductory text.
    - **Contact Links**: Support for multiple URLs (LinkedIn, GitHub, Portfolio, etc.) with clickable links in the PDF.
    - **Education & Certifications**: Detailed tracking of degrees, school locations, and graduation dates.
    - **Professional Experience**: Record your work history, projects, and internships with formatted bullet points.
- **Customization & Tagging**:
    - **Tag-Based Filtering**: Add custom tags or regex patterns to highlight specific skills or keywords.
    - **Job Description Matching**: Input a job description to match your tags and optimize your resume for specific roles.
- **Data Persistence & Portability**:
    - **Local Storage**: Automatically saves your progress locally, so you don't lose your data on refresh.
    - **JSON Import/Export**: Save your resume data as a JSON file to backup or share, and reload it later.
    - **PDF Export**: Download a high-quality, formatted PDF ready for job applications.

### 🛠️ Technologies Used

- **HTML5 & CSS3**: Structured and styled with modern web standards.
- **JavaScript (ES6+)**: Core application logic and data management.
- **Bootstrap 5**: Responsive design and UI components.
- **[jsPDF](https://github.com/parallax/jsPDF)**: Client-side PDF generation library.

### 📂 Project Structure

- `index.html`: The main interface for standard resume data entry.
- `custom.html`: Specialized interface for tag management and job description matching.
- `js/app.js`: Centralized logic for data handling, PDF rendering, and file operations.
- `css/style.css`: Custom styling and layout adjustments.

### 📖 How to Use

1. **Enter Your Details**: Fill in the forms on the **Home** (Normal) page with your personal, education, and experience information.
2. **View Live Preview**: Watch the right-hand panel update automatically as you provide information.
3. **Customize with Tags**: Switch to the **Custom** page to add keywords (tags) or regex patterns. You can also paste a job description to help identify matching skills.
4. **Save and Export**:
    - Use **Save JSON** to keep a portable backup of your data.
    - Use **Load JSON** to restore a previous session.
    - Click **Download PDF** to get your final resume.
---
*Created with the goal of making resume building simple, fast, and customizable.*
