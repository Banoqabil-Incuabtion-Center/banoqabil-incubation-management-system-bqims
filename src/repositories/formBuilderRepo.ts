import api from "../lib/axios";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "date"
  | "phone"
  | "textarea"
  | "checkbox"
  | "radio"
  | "select"
  | "file";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

export interface FormData {
  formKey: string;
  title: string;
  subtitle: string;
  sections: FormSection[];
}

export const initialDefaultForm: FormData = {
  formKey: "internship_registration",
  title: "Registration Form",
  subtitle: "Manage the fields and sections used in the internship registration form.",
  sections: [
    {
      id: "personal_information",
      title: "Personal Information",
      description: "Please provide your personal information.",
      order: 0,
      fields: [
        {
          id: "full_name",
          label: "Full name",
          type: "text",
          placeholder: "Enter your full name",
          required: true,
          options: [],
          order: 0,
        },
        {
          id: "date_of_birth",
          label: "Date of birth",
          type: "date",
          placeholder: "",
          required: true,
          options: [],
          order: 1,
        },
        {
          id: "gender",
          label: "Gender",
          type: "radio",
          placeholder: "",
          required: true,
          options: ["Male", "Female"],
          order: 2,
        },
        {
          id: "cnic_number",
          label: "CNIC number",
          type: "text",
          placeholder: "42101-xxxxxxx-x",
          required: true,
          options: [],
          order: 3,
        },
        {
          id: "father_guardian_name",
          label: "Father/Guardian name",
          type: "text",
          placeholder: "Enter father or guardian name",
          required: true,
          options: [],
          order: 4,
        },
        {
          id: "about_yourself",
          label: "About yourself",
          type: "textarea",
          placeholder: "Tell us a bit about yourself",
          required: true,
          options: [],
          order: 5,
        },
      ],
    },
    {
      id: "contact_information",
      title: "Contact Information",
      description: "Please provide your contact information.",
      order: 1,
      fields: [
        {
          id: "address",
          label: "Address",
          type: "text",
          placeholder: "Enter residential address",
          required: true,
          options: [],
          order: 0,
        },
        {
          id: "email_address",
          label: "Email address",
          type: "email",
          placeholder: "example@domain.com",
          required: true,
          options: [],
          order: 1,
        },
        {
          id: "phone_number",
          label: "Phone number",
          type: "phone",
          placeholder: "0300-1234567",
          required: true,
          options: [],
          order: 2,
        },
        {
          id: "guardian_number",
          label: "Guardian number",
          type: "phone",
          placeholder: "0300-1234567",
          required: false,
          options: [],
          order: 3,
        },
      ],
    },
    {
      id: "course_campus_details",
      title: "Course & Campus Details",
      description: "Please provide your course and campus preferences.",
      order: 2,
      fields: [
        {
          id: "course",
          label: "Course",
          type: "select",
          placeholder: "Select your course",
          required: true,
          options: [
            "Web Development",
            "Mobile App Development",
            "Cyber Security",
            "Game Development with Unity",
            "Graphic Designing",
            "Digital Marketing",
            "Data Science",
            "Data Analytics",
            "E-commerce",
            "Content Writing",
            "Video Editing",
          ],
          order: 0,
        },
        {
          id: "teacher_name",
          label: "Teacher name",
          type: "text",
          placeholder: "Enter teacher / instructor name",
          required: true,
          options: [],
          order: 1,
        },
        {
          id: "campus",
          label: "Campus",
          type: "select",
          placeholder: "Select campus",
          required: true,
          options: [
            "Bahadurabad",
            "Expo (Fossphorus)",
            "Clifton",
            "Idarah Noor e Haq",
            "Jamia Millia",
          ],
          order: 2,
        },
        {
          id: "obtained_marks",
          label: "Obtained marks",
          type: "number",
          placeholder: "Enter marks obtained",
          required: true,
          options: [],
          order: 3,
        },
      ],
    },
  ],
};

export class FormBuilderRepo {
  private localKey = "ims_form_builder_state";

  // Cache fallback to persist locally if backend unreachable
  private saveToLocal(form: FormData) {
    try {
      localStorage.setItem(this.localKey, JSON.stringify(form));
    } catch {
      // Ignore quota errors
    }
  }

  private getFromLocal(): FormData {
    try {
      const saved = localStorage.getItem(this.localKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return initialDefaultForm;
  }

  // ✅ Get form configuration
  async getForm(): Promise<FormData> {
    try {
      const res = await api.get("/api/form-builder");
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.warn("Backend /api/form-builder not reachable, using cached form:", err);
    }
    return this.getFromLocal();
  }

  // ✅ Get public form schema (unauthenticated)
  async getPublicForm(): Promise<FormData> {
    try {
      const res = await api.get("/api/form-builder/public");
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.warn("Backend /api/form-builder/public not reachable, using cached form:", err);
    }
    return this.getFromLocal();
  }

  // ✅ Update form details
  async updateForm(data: Partial<FormData>): Promise<FormData> {
    try {
      const res = await api.put("/api/form-builder", data);
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to update form on server:", err);
    }
    const current = this.getFromLocal();
    const updated = { ...current, ...data };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Add Section
  async addSection(title: string, description?: string): Promise<FormData> {
    try {
      const res = await api.post("/api/form-builder/sections", { title, description });
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to add section on server:", err);
    }
    // Local fallback
    const current = this.getFromLocal();
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: title.trim(),
      description: description?.trim() || "",
      order: current.sections.length,
      fields: [],
    };
    const updated: FormData = {
      ...current,
      sections: [...current.sections, newSection],
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Update Section
  async updateSection(sectionId: string, title: string, description?: string): Promise<FormData> {
    try {
      const res = await api.put(`/api/form-builder/sections/${sectionId}`, { title, description });
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to update section on server:", err);
    }
    const current = this.getFromLocal();
    const updated: FormData = {
      ...current,
      sections: current.sections.map((s) =>
        s.id === sectionId ? { ...s, title: title.trim(), description: description?.trim() || "" } : s
      ),
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Delete Section
  async deleteSection(sectionId: string): Promise<FormData> {
    try {
      const res = await api.delete(`/api/form-builder/sections/${sectionId}`);
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to delete section on server:", err);
    }
    const current = this.getFromLocal();
    const updated: FormData = {
      ...current,
      sections: current.sections
        .filter((s) => s.id !== sectionId)
        .map((s, idx) => ({ ...s, order: idx })),
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Add Field
  async addField(
    sectionId: string,
    field: Omit<FormField, "id" | "order">
  ): Promise<FormData> {
    try {
      const res = await api.post(`/api/form-builder/sections/${sectionId}/fields`, field);
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to add field on server:", err);
    }
    const current = this.getFromLocal();
    const section = current.sections.find((s) => s.id === sectionId);
    if (!section) return current;

    const baseId = field.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const newField: FormField = {
      ...field,
      id: `${baseId}_${Date.now()}`,
      order: section.fields.length,
    };

    const updated: FormData = {
      ...current,
      sections: current.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s
      ),
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Update Field
  async updateField(
    sectionId: string,
    fieldId: string,
    field: Partial<FormField>
  ): Promise<FormData> {
    try {
      const res = await api.put(`/api/form-builder/sections/${sectionId}/fields/${fieldId}`, field);
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to update field on server:", err);
    }
    const current = this.getFromLocal();
    const updated: FormData = {
      ...current,
      sections: current.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...field } : f)),
            }
          : s
      ),
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Delete Field
  async deleteField(sectionId: string, fieldId: string): Promise<FormData> {
    try {
      const res = await api.delete(`/api/form-builder/sections/${sectionId}/fields/${fieldId}`);
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to delete field on server:", err);
    }
    const current = this.getFromLocal();
    const updated: FormData = {
      ...current,
      sections: current.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields
                .filter((f) => f.id !== fieldId)
                .map((f, idx) => ({ ...f, order: idx })),
            }
          : s
      ),
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Reorder Fields
  async reorderFields(sectionId: string, fieldIds: string[]): Promise<FormData> {
    try {
      const res = await api.put(`/api/form-builder/sections/${sectionId}/reorder`, { fieldIds });
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to reorder fields on server:", err);
    }
    const current = this.getFromLocal();
    const section = current.sections.find((s) => s.id === sectionId);
    if (!section) return current;

    const map = new Map(section.fields.map((f) => [f.id, f]));
    const reordered: FormField[] = [];
    fieldIds.forEach((id, index) => {
      const f = map.get(id);
      if (f) {
        reordered.push({ ...f, order: index });
        map.delete(id);
      }
    });
    map.forEach((f) => {
      reordered.push({ ...f, order: reordered.length });
    });

    const updated: FormData = {
      ...current,
      sections: current.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: reordered } : s
      ),
    };
    this.saveToLocal(updated);
    return updated;
  }

  // ✅ Reset Form to default
  async resetForm(): Promise<FormData> {
    try {
      const res = await api.post("/api/form-builder/reset");
      if (res.data?.form) {
        this.saveToLocal(res.data.form);
        return res.data.form;
      }
    } catch (err) {
      console.error("Failed to reset form on server:", err);
    }
    this.saveToLocal(initialDefaultForm);
    return initialDefaultForm;
  }

  // ✅ Submit public application
  async submitApplication(formData: Record<string, any>) {
    const res = await api.post("/api/form-builder/submit", { formData });
    return res.data;
  }

  // ✅ Get submissions
  async getSubmissions(page = 1, limit = 20) {
    const res = await api.get(`/api/form-builder/submissions?page=${page}&limit=${limit}`);
    return res.data;
  }
}

export const formBuilderRepo = new FormBuilderRepo();
