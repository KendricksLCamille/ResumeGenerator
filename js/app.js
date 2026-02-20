/**
 * @typedef {Object} Contact
 * @property {string} [name] - The name of the contact.
 * @property {string} [url] - The URL for the contact.
 */

/**
 * @typedef {Object} Education
 * @property {string} [date] - The date of the education entry.
 * @property {string} [degreeType] - The type of degree (e.g., Certificate, B.S.).
 * @property {string} [name] - The name of the institution.
 * @property {string} [category] - The field of study.
 * @property {string} [city] - The city of the institution.
 * @property {string} [state] - The state of the institution.
 */

/**
 * @typedef {Object} Experience
 * @property {string} [title] - The job or project title.
 * @property {string} [company] - The name of the company or organization.
 * @property {string} [location] - The location (e.g., State).
 * @property {string} [url] - A link to the project or company website.
 * @property {string} [startDate] - The start date of the experience.
 * @property {string} [endDate] - The end date of the experience (or 'Present').
 * @property {string} [summary] - A brief summary of the experience.
 * @property {string} [details] - Detailed bullet points for the experience.
 */

/** @typedef Tag
 *  @property {string} string - The string representation of the tag.
 *  @property {boolean} isRegex - Indicates if the tag is a regular expression.
 * */

/**
 * @typedef {Object} Resume
 * @property {string} version - The application version when this résumé was created.
 * @property {string} name - The candidate's name.
 * @property {string} email - The candidate's email address.
 * @property {string} phone - The candidate's phone number.
 * @property {string} additionalText - Any additional introductory text for the résumé.
 * @property {Set<Contact>} contacts - A set of additional contact methods.
 * @property {Set<Education>} education - A set of education and certification records.
 * @property {Set<Experience>} experience - A set of work history, projects, and internships.
 * @property {Set<Tag>} tags - A set of tags that can represent a string or regex
 */

const APP_VERSION = "1.0.0";

/** @type {Resume} */
let resume = {
    version: APP_VERSION,
    name: '',
    email: '',
    phone: '',
    additionalText: '',
    contacts: new Set(),
    education: new Set(),
    experience: new Set(),
    tags: new Set(),
}

let currentPdfBlob = null;
let updateTimeout = null;

/**
 * Maps hyphenated form names/IDs to camelCase object properties.
 * @param {string} key - The hyphenated key (e.g., 'experience-start-date').
 * @returns {string} The camelCase property name (e.g., 'startDate').
 */
function mapKeyToProperty(key) {
    // Known manual overrides for specific keys that don't follow a simple pattern
    const overrides = {
        'contact-form-name-input': 'name',
        'contact-form-url-input': 'url',
    };

    if (overrides[key]) return overrides[key];

    // Remove common form prefixes and convert remaining parts to camelCase
    let parts = key.split('-');
    if (parts.length > 1 && (parts[0] === 'experience' || parts[0] === 'education' || parts[0] === 'contact')) {
        parts.shift();
    }

    // Convert hyphenated-string to camelCase
    return parts.map((part, index) =>
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
}

/**
 * Maps property names back to form element IDs/names.
 * @param {string} prefix - The prefix of the form fields (e.g., 'education').
 * @param {string} property - The camelCase property name.
 * @returns {string} The hyphenated form element ID/name.
 */
function mapPropertyToKey(prefix, property) {
    let hyphenated = property.replaceAll(/([A-Z])/g, "-$1").toLowerCase();

    // Reverse the shift of 'degree' for 'degreeType' if it happens
    if (prefix === 'education' && property === 'degreeType') {
        return 'education-degree-type';
    }

    return `${prefix}-${hyphenated}`;
}

/**
 * Safely loads resume data from a JSON object and migrates legacy data if necessary.
 * @param {Resume} resume - The current resume state to update.
 * @param {Object} loadedResume - The raw JSON data.
 */
function safeLoadResume(resume, loadedResume) {
    resume.name = loadedResume.name || '';
    resume.email = loadedResume.email || '';
    resume.phone = loadedResume.phone || '';
    resume.additionalText = loadedResume.additionalText || '';

    /**
     * Migrates individual entries from hyphenated keys to camelCase.
     * @param {Object} item - The entry to migrate.
     * @returns {Object} The migrated entry.
     */
    const migrateItem = (item) => {
        const migrated = {};
        for (const [key, value] of Object.entries(item)) {
            const property = mapKeyToProperty(key);
            migrated[property] = value;
        }
        return migrated;
    };

    resume.contacts = new Set((loadedResume.contacts || []).map(migrateItem));
    resume.education = new Set((loadedResume.education || []).map(migrateItem));
    resume.experience = new Set((loadedResume.experience || []).map(migrateItem));
    resume.tags = new Set(loadedResume.tags || []);
}

/**
 * Updates the PDF preview.
 * @param {boolean} [immediate=false] - If true, generates the PDF immediately without a timeout.
 */
function updatePreview(immediate = false) {
    const previewElement = document.getElementById('pdf-preview');

    if (immediate) {
        generatePdf();
        return;
    }

    // Start fade out
    previewElement.classList = 'fade-out';

    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        generatePdf();
        // Fade in after update
        previewElement.classList = 'fade-in';
    }, 1000);
}

/**
 * Generates the PDF using jsPDF.
 */
function generatePdf() {
    const {jsPDF} = globalThis.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = 20;

    /**
     * Calculates line height in MM.
     * @param {number} fontSize - Font size in pt.
     * @param {number} spacing - Line spacing factor.
     * @returns {number} Line height in mm.
     */
    const getLineHeightMM = (fontSize, spacing) => (fontSize * 0.352778) * spacing;

    /**
     * Formats a date string (YYYY-MM) into a more readable format (MMM YYYY).
     * @param {string} dateStr - The date string to format.
     * @returns {string} The formatted date.
     */
    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === 'Present') return dateStr || 'Present';
        const [year, month] = dateStr.split('-').map(Number);
        if (!year || !month) return dateStr;
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
    };

    // Font setup
    doc.setFont("helvetica", "normal"); // Arial is usually mapped to helvetica in jsPDF

    // 1. Name: Bold, Center, 14pt
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(resume.name || '', pageWidth / 2, y, {align: 'center'});
    y += getLineHeightMM(14, 1.15);

    // 2. Contact info: 12pt, plain, 1.15 spacing
    // 'Phone Number | Email | Contact-info1 | Contact-info2 ...'
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    let contactParts = [];
    if (resume.phone) {
        contactParts.push({text: resume.phone, link: `tel:${resume.phone.replaceAll(/\s+/g, '')}`});
    }
    if (resume.email) {
        contactParts.push({text: resume.email, link: `mailto:${resume.email}`});
    }

    resume.contacts.forEach(contact => {
        const name = contact.name;
        const url = contact.url;
        if (name) {
            contactParts.push({text: name, link: url});
        }
    });

    if (contactParts.length > 0) {
        const separator = " | ";
        let currentX = margin;

        // To center the whole contact line, we first calculate its total width
        let totalWidth = 0;
        contactParts.forEach((part, index) => {
            totalWidth += doc.getTextWidth(part.text);
            if (index < contactParts.length - 1) {
                totalWidth += doc.getTextWidth(separator);
            }
        });

        currentX = (pageWidth - totalWidth) / 2;

        contactParts.forEach((part, index) => {
            doc.setTextColor(0, 0, 255); // Blue for links
            const partWidth = doc.getTextWidth(part.text);
            doc.text(part.text, currentX, y);
            if (part.link) {
                // Adjusting the link rectangle to be more accurate
                doc.link(currentX, y - 4, partWidth, 5, {url: part.link});
            }
            currentX += partWidth;

            if (index < contactParts.length - 1) {
                doc.setTextColor(0, 0, 0); // Black for separator
                doc.text(separator, currentX, y);
                currentX += doc.getTextWidth(separator);
            }
        });
        y += getLineHeightMM(12, 1.15);
    }

    // 3. Additional information: dynamically, 1.15 spacing
    const additionalText = resume.additionalText?.trim();
    if (additionalText) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(additionalText, contentWidth);
        doc.text(lines, pageWidth / 2, y, {align: 'center'});
        y += lines.length * getLineHeightMM(12, 1.15);
    }

    // New Line to separate sections
    y += 5;

    // Global settings for the remaining sections: 10.5 font, 1.00 spacing
    const sectionFontSize = 10.5;
    const sectionSpacing = 1;
    const sectionLineHeight = getLineHeightMM(sectionFontSize, sectionSpacing);
    doc.setFontSize(sectionFontSize);
    doc.setTextColor(0, 0, 0);

    // Education and Certification
    doc.setFont("helvetica", "bold");
    doc.text("Education and Certification", margin, y);
    y += sectionLineHeight;

    doc.setFont("helvetica", "normal");
    const sortedEducation = Array.from(resume.education).sort((a, b) => {
        return (b.date || "").localeCompare(a.date || "");
    });

    const now = new Date();
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(now.getFullYear() - 3);

    sortedEducation.forEach(edu => {
        if (edu.degreeType === 'Certificate') {
            doc.text(`• ${edu.name}`, margin + 5, y);
        } else {
            // Current Degree in X from Y, City, State [right-aligned](Status - Graduated or month date)
            let locationText = "";
            if (edu.city && edu.state) {
                locationText = `, ${edu.city}, ${edu.state}`;
            } else if (edu.city) {
                locationText = `, ${edu.city}`;
            } else if (edu.state) {
                locationText = `, ${edu.state}`;
            }

            const leftText = `• ${edu.degreeType} in ${edu.category} | ${edu.name}${locationText}`;

            let rightText = "";
            const eduDateStr = edu.date; // YYYY-MM
            if (eduDateStr) {
                const eduDate = new Date(eduDateStr + "-01");
                if (eduDate < threeYearsAgo) {
                    rightText = "Status - Graduated";
                } else {
                    // Show month date
                    rightText = formatDate(eduDateStr);
                }
            }

            doc.text(leftText, margin + 5, y);
            if (rightText) {
                doc.text(rightText, pageWidth - margin, y, {align: 'right'});
            }
        }
        y += sectionLineHeight;
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });

    // New Line
    y += 5;

    // Work History/Projects/Internships
    doc.setFont("helvetica", "bold");
    doc.text("Work History/Projects/Internships", margin, y);
    y += sectionLineHeight;

    const categoryOrder = {
        "Work Experience": 1,
        "Contract": 2,
        "Internship": 3,
        "Project": 4,
        "Projects": 4,
        "Volunteer": 5
    };

    const sortedExperience = Array.from(resume.experience).sort((a, b) => {
        const orderA = categoryOrder[a.category] || 99;
        const orderB = categoryOrder[b.category] || 99;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return (b.startDate || "").localeCompare(a.startDate || "");
    });

    sortedExperience.forEach(exp => {
        // [italics]([left aligned](Title at Company, Company, State) and [right-aligned](Start-End/Current/Present)
        doc.setFont("helvetica", "italic"); // italics

        const title = exp.title || '';
        const company = exp.company || '';
        const location = exp.location || ''; // State/Location
        const url = exp.url || '';

        let currentX = margin;
        if (title) {
            if (url) {
                doc.setTextColor(0, 0, 255); // Blue
            }
            doc.text(title, currentX, y);
            const titleWidth = doc.getTextWidth(title);
            if (url) {
                doc.link(currentX, y - 4, titleWidth, 5, {url: url});
                // Draw underline in the same color as the text
                doc.setDrawColor(0, 0, 255);
                doc.line(currentX, y + 0.5, currentX + titleWidth, y + 0.5);
                doc.setTextColor(0, 0, 0); // Reset to black
                doc.setDrawColor(0, 0, 0); // Reset to black
            }
            currentX += titleWidth;
        }

        let remainingParts = [];
        if (company) remainingParts.push(company);
        if (location) remainingParts.push(location);

        if (remainingParts.length > 0) {
            let remainingText = (title ? ", " : "") + remainingParts.join(", ");
            doc.text(remainingText, currentX, y);
        }

        const start = exp.startDate || '';
        const end = exp.endDate || 'Present';
        const formattedStart = formatDate(start);
        const formattedEnd = formatDate(end);
        const rightText = formattedStart ? `${formattedStart} - ${formattedEnd}` : formattedEnd;

        doc.text(rightText, pageWidth - margin, y, {align: 'right'});
        y += sectionLineHeight;

        if (url) {
            y += 1; // Extra spacing for the underline
        }

        doc.setFont("helvetica", "normal");

        const MAX_NUMBER_OF_BULLETS_TO_DISPLAY = 8;
        let bullets = [];

        const summary = exp.summary?.trim();
        if (summary) {
            bullets.push(summary);
        }

        if (exp.details) {
            const detailBullets = exp.details.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            bullets = bullets.concat(detailBullets);
        }

        // Only display the first 8 bullet points
        bullets.slice(0, MAX_NUMBER_OF_BULLETS_TO_DISPLAY).forEach(bullet => {
            const splitBullet = doc.splitTextToSize(`• ${bullet}`, contentWidth - 5);
            doc.text(splitBullet, margin + 5, y);
            y += splitBullet.length * sectionLineHeight * 1.2;
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.setFontSize(sectionFontSize);
            }
        });

        y += sectionLineHeight / 1.5; // small gap between entries
        if (y > 280) {
            doc.addPage();
            y = 20;
            doc.setFontSize(sectionFontSize);
        }
    });

    // Output as blob url for preview and download reuse
    currentPdfBlob = doc.output('blob');
    document.getElementById('pdf-preview').src = URL.createObjectURL(currentPdfBlob);
}

/**
 * Handles experience date changes to ensure the end date is after start date.
 * @param {string} prefix - The prefix of the date input IDs.
 */
function handleExperienceDateChange(prefix) {
    const startDateElement = /** @type {HTMLInputElement} */ (document.getElementById(`${prefix}-start-date`));
    const endDateElement = /** @type {HTMLInputElement} */ (document.getElementById(`${prefix}-end-date`));
    const startDate = startDateElement.value;
    const endDate = endDateElement.value;

    if (startDate && endDate) {
        if (endDate < startDate) {
            endDateElement.value = '';
        }
    }
}

/**
 * Handles changes to the education type (e.g., Degree vs. Certificate).
 */
function handleEducationTypeChange() {
    const degreeType = document.getElementById('education-degree-type').value;
    const categoryGroup = document.getElementById('education-category-group');
    const locationGroup = document.getElementById('education-location-group');
    const dateGroup = document.getElementById('education-date-group');
    const nameLabel = document.getElementById('education-name-label');
    const nameInput = document.getElementById('education-name');

    if (degreeType === 'Certificate') {
        categoryGroup.style.display = 'none';
        locationGroup.style.display = 'none';
        dateGroup.style.display = 'none';

        document.getElementById('education-category').required = false;
        document.getElementById('education-city').required = false;
        document.getElementById('education-state').required = false;
        document.getElementById('education-date').required = false;

        nameLabel.innerText = 'Certificate Name';
        nameInput.placeholder = 'Enter Certificate Name';
    } else {
        categoryGroup.style.display = 'flex';
        locationGroup.style.display = 'flex';
        dateGroup.style.display = 'flex';

        document.getElementById('education-category').required = true;
        document.getElementById('education-city').required = true;
        document.getElementById('education-state').required = true;
        document.getElementById('education-date').required = true;

        nameLabel.innerText = 'School Name';
        nameInput.placeholder = 'Enter School Name';
    }
}

/**
 * Clears all input values in a form.
 * @param {HTMLElement} form - The container to clear.
 */
function clearFormValues(form) {
    let children = form.children;
    for (const child of children) {
        if (child.tagName === 'INPUT' || child.tagName === 'TEXTAREA') {
            child.value = '';
        } else if (child.tagName === 'SELECT') {
            child.selectedIndex = -1; // reset to no value
        }
        // Optional: recurse into nested forms/containers if needed
        if (child.children && child.children.length > 0) {
            clearFormValues(child);
        }
    }
}

/**
 * Generates a form with bread layout for the given formId and dataArray.
 * @param {string} title - The title of the bread section
 * @param {string} formId - The ID of the form element.
 * @param {Set<Object>} dataArray - The set of form fields data.
 * @param {Function} sortFunc - Optional sorting function for dataArray.
 * @param {Function} getNameFunc - Optional function to get the name for the dropdown list.
 * @throws {Error} If form element with given id does not exist or is not a form.
 */
function makeFormBread(title, formId, dataArray, sortFunc = null, getNameFunc = (entry) => entry.name || entry.id || "Unnamed Entry") {
    let form = /** @type {HTMLFormElement} */ (document.getElementById(formId));
    if (form === null) {
        let message = 'Form element with id ' + formId + ' does not exist';
        alert(message);
        console.error(message);
        throw new Error(message);
    } else if (form.tagName !== 'FORM') {
        let message = 'Form element with id ' + formId + ' is not a form';
        alert(message);
        console.error(message);
        throw new Error(message);
    }

    let currentItem = null;
    let localArray = [];

    let div = createDivWithClassRow();
    div.id = "bread-" + formId;
    div.classList.add('bread');
    form.parentElement.replaceChild(div, form);

    let titleHeader = document.createElement('h3');
    titleHeader.innerText = title;
    div.appendChild(titleHeader);

    let select = document.createElement('select');
    select.classList.add('form-select');
    select.onchange = () => {
        let index = select.selectedIndex - 1; // -1 for the placeholder "Select an entry"
        if (index >= 0) {
            currentItem = localArray[index];

            // For each element, if its name or id matches a key in the current item, set its value
            const prefix = formId.split('-')[0];
            for (const [property, value] of Object.entries(currentItem)) {
                const key = mapPropertyToKey(prefix, property);
                const element = form.elements[key];
                if (element) {
                    element.value = value;
                }
            }
            // Trigger onchange for any select elements to update UI (like degree type)
            Array.from(form.elements).forEach(element => {
                if (element.tagName === 'SELECT' && element.onchange) {
                    element.onchange();
                }
            });
        } else {
            clearFormValues(form);
            currentItem = null;
            // Trigger onchange for any select elements to update UI
            Array.from(form.elements).forEach(element => {
                if (element.tagName === 'SELECT' && element.onchange) {
                    element.onchange();
                }
            });
        }
    };

    let newButton = createButtonWithName('New', () => {
        clearFormValues(form);
        currentItem = null;
        select.selectedIndex = 0;
        // Trigger onchange for any select elements to update UI
        Array.from(form.elements).forEach(element => {
            if (element.tagName === 'SELECT' && element.onchange) {
                element.onchange();
            }
        });
    }, 'btn-success');

    let selectGroup = document.createElement('div');
    selectGroup.classList.add('input-group', 'mb-3');
    selectGroup.append(select, newButton);
    div.appendChild(selectGroup);

    let deleteButton = createButtonWithName('Delete', deleteItem, 'btn-danger');

    let saveButton = createButtonWithName('Save', null, 'btn-primary');
    saveButton.type = 'submit';
    form.appendChild(saveButton);

    form.onsubmit = (e) => {
        e.preventDefault();
        saveItem();
    };

    let buttonList = createDivWithClassRow();
    buttonList.id = 'buttonList';
    buttonList.classList.add('mb-3');
    buttonList.append(deleteButton);

    let formPortion = createDivWithClassRow();
    formPortion.appendChild(form);
    formPortion.classList.add('mb-3');

    div.append(formPortion, buttonList);

    updateSelectList();

    function createDivWithClassRow() {
        let div = document.createElement('div');
        div.classList.add('row');
        return div;
    }

    function createButtonWithName(name, onClick, primaryClass = null) {
        let button = document.createElement('button');
        button.type = 'button';
        button.innerText = name;
        button.onclick = onClick;
        button.classList.add('btn', 'me-2');
        if (primaryClass) {
            button.classList.add(primaryClass);
        }
        return button;
    }

    function updateSelectList() {
        localArray = Array.from(dataArray);
        if (sortFunc) {
            localArray.sort(sortFunc);
        }
        select.innerHTML = '';
        let placeholder = document.createElement('option');
        placeholder.text = "-- Select an entry --";
        placeholder.value = "-1";
        select.add(placeholder);

        localArray.forEach((item, index) => {
            let option = document.createElement('option');
            option.text = getNameFunc(item);
            option.value = index + '';
            select.add(option);
        });

        if (currentItem === null) {
            select.selectedIndex = 0;
        } else {
            let index = localArray.indexOf(currentItem);
            select.selectedIndex = index + 1;
        }
    }


    function deleteItem() {
        if (currentItem === null) {
            alert("Nothing to delete");
            return;
        }

        dataArray.delete(currentItem);
        currentItem = null;
        updateSelectList();
        saveResumeToLocalStorage();
        updatePreview();
    }

    function saveItem() {
        const data = {};

        // Loop through all form elements
        const prefix = formId.split('-')[0];
        Array.from(form.elements).forEach(element => {
            // Only process input, select, and textarea
            const tag = element.tagName.toLowerCase();
            if (['input', 'textarea', 'select'].includes(tag)) {
                const key = element.name || element.id;
                if (!key) return; // Skip if no name or id

                // Only save elements that belong to this form
                if (!key.startsWith(prefix)) return;

                const property = mapKeyToProperty(key);
                data[property] = element.value;
            }
        });

        if (currentItem === null) {
            dataArray.add(data);
            console.log("Added \n" + JSON.stringify(data));
            currentItem = data;
        } else {
            // Update the existing object properties
            Object.assign(currentItem, data);
            console.log("Saved \n" + JSON.stringify(data));
        }
        updateSelectList();
        saveResumeToLocalStorage();
        updatePreview();
    }
}

/**
 * Saves the current resume state to localStorage.
 */
function saveResumeToLocalStorage() {
    const resumeToSave = {
        ...resume,
        contacts: Array.from(resume.contacts),
        education: Array.from(resume.education),
        experience: Array.from(resume.experience),
        tags: Array.from(resume.tags)
    };
    localStorage.setItem('resumeData', JSON.stringify(resumeToSave));
}

/**
 * Downloads the resume data as a JSON file.
 */
function downloadJson() {
    const resumeToSave = {
        ...resume,
        contacts: Array.from(resume.contacts),
        education: Array.from(resume.education),
        experience: Array.from(resume.experience),
        tags: Array.from(resume.tags)
    };
    const dataStr = JSON.stringify(resumeToSave);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'resume.json';

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

/**
 * Loads resume data from a JSON file.
 * @param {Event} event - The file input change event.
 */
function loadJson(event) {
    const file = /** @type {HTMLInputElement} */ (event.target).files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const loadedResume = JSON.parse(e.target.result);

            // Basic version check (optional warning)
            if (loadedResume.version !== APP_VERSION) {
                console.warn(`Version mismatch: JSON is ${loadedResume.version}, App is ${APP_VERSION}`);
            }

            // Update resume object
            safeLoadResume(resume, loadedResume)

            // Save to local storage
            saveResumeToLocalStorage();

            // Reload the page to refresh all makeFormBread instances easily,
            // OR we'd need a way to notify them. Reloading is safer for state consistency.
            location.reload();
        } catch (err) {
            alert('Error parsing JSON file');
            console.error(err);
        }
    };

    reader.readAsText(file);
}

/**
 * Downloads the generated PDF.
 */
function downloadPdf() {
    if (!currentPdfBlob) {
        updatePreview(true);
    }

    const url = globalThis.URL.createObjectURL(currentPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resume.name || 'resume'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Optionally revoke the URL after download, but we keep it for preview if we just reuse the currentPdfBlob
}

function onContactFormEmailChange() {
    const urlInputId = "contact-form-url-input";
    const nameInputId = "contact-form-name-input";
    try {
        /**@type HTMLInputElement*/
        let urlInput = document.getElementById(urlInputId)

        /**@type HTMLInputElement*/
        let nameInput = document.getElementById(nameInputId);

        let url = urlInput.value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        const host = new URL(url).hostname;
        const parts = host.replace(/^www\./, '').split('.');
        if (parts.length > 0) {
            const hostName = parts[0];
            nameInput.value = hostName.charAt(0).toUpperCase() + hostName.slice(1);
        }
    } catch (e) {
        console.error("Invalid URL for name extraction", e);
    }
}

