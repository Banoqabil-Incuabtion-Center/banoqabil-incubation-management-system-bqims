import React, { useEffect, useState } from "react";
import { Modal, Select, message } from "antd";
const { Option } = Select;
import { Button } from "@/components/ui/button";
import { MdDeleteSweep, MdEditSquare } from "react-icons/md";
import UrlBreadcrumb from "@/components/UrlBreadcrumb";
import Loader from "@/components/Loader";
import { projectRepo } from "@/repositories/projectRepo";
import { teamRepo } from "@/repositories/teamRepo";
import { pmRepo } from "@/repositories/pmRepo";
import { Link } from "react-router-dom";

interface Project {
  _id: string;
  title: string;
  description: string;
  file?: string;
  teamName: {
    _id: string;
    teamName: string;
  };
  PM: {
    _id: string;
    name: string;
  };
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<{ _id: string; teamName: string }[]>([]);
  const [pms, setPms] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    teamName: "",
    PM: "",
  });

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const data = await projectRepo.getAllProjects();
      setProjects(data || []);
    } catch {
      message.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams and PMs for dropdown
  const fetchDropdownData = async () => {
    try {
      const teamsData = await teamRepo.getAllTeams();
      const pmsData = await pmRepo.getPMs();
      setTeams(teamsData || []);
      setPms(pmsData || []);
    } catch {
      message.error("Failed to fetch Teams or PMs");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      teamName: "",
      PM: "",
    });
    setFile(null);
    setErrors({});
    setEditingId(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const form = new FormData();
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("teamName", formData.teamName);
      form.append("PM", formData.PM);
      if (file) {
        form.append("file", file);
      }

      if (editingId) {
        await projectRepo.updateProject(editingId, form, true);
        message.success("Project updated successfully");
      } else {
        await projectRepo.createProject(form, true);
        message.success("Project assigned successfully");
      }
      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        message.error(error.response?.data?.message || "Action failed");
      }
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Are you sure you want to delete this project?",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await projectRepo.deleteProject(id);
          setProjects((prev) => prev.filter((p) => p._id !== id));
          message.success("Project deleted successfully");
        } catch {
          message.error("Failed to delete project");
        }
      },
    });
  };

  const openEditModal = (project: Project) => {
    setFormData({
      title: project.title,
      description: project.description,
      teamName: project.teamName?._id || "",
      PM: project.PM?._id || "",
    });
    setEditingId(project._id);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchProjects();
    fetchDropdownData();
  }, []);

  return (
    <div className="p-6">
      <UrlBreadcrumb />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setIsModalOpen(true)}>Assign Project</Button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project._id}
                className="bg-white dark:bg-neutral-900 shadow rounded-lg p-4"
              >
                <h2 className="text-lg font-semibold">{project.title}</h2>
                <p className="text-gray-600 text-sm mt-2">
                  {project.description}
                </p>
                <p className="text-sm mt-2">
                  <Link to={`/teams`}>
                    <strong>Team:</strong> {project.teamName?.teamName}
                  </Link>

                </p>
                <p className="text-sm">
                  <Link to={`/pm`}>
                    <strong>Project Manager:</strong> {project.PM?.name}
                  </Link>
                </p>

                {project.file && (
                  <div className="mt-3">

                    <Button
                      className="mt-2"
                      onClick={() =>
                        window.open(
                          `http://localhost:3000/admin/download/${project._id}`,
                          "_blank"
                        )
                      }
                    >
                      Download PDF
                    </Button>
                  </div>
                )}

                <div className="flex justify-start gap-2 mt-4">
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => openEditModal(project)}
                    className="cursor-pointer rounded-full"
                  >
                    <MdEditSquare className="text-white" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(project._id)}
                    className="cursor-pointer rounded-full"
                  >
                    <MdDeleteSweep className="text-white" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No projects found</p>
          )}
        </div>
      )}

      {/* Assign/Edit Modal */}
      <Modal
        title={
          <span className="text-xl font-semibold mb-3 text-center">
            {editingId ? "Edit Project" : "Assign Project"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        footer={null}
        centered
      >
        <div className="grid grid-cols-1 gap-6 mb-6 mt-7">
          {/* Title Input */}
          <div className="relative z-0 w-full group">
            <input
              type="text"
              name="title"
              id="title"
              value={formData.title}
              onChange={handleChange}
              className={`peer block w-full border-0 border-b-2 bg-transparent py-2.5 px-0 text-gray-900 focus:border-blue-600 focus:outline-none ${errors.title ? "border-red-500" : "border-gray-300"
                }`}
              placeholder=" "
              autoComplete="off"
            />
            <label
              htmlFor="title"
              className={`absolute top-3 origin-[0] transform text-gray-500 duration-200 ${formData.title
                  ? "-translate-y-6 scale-75 text-blue-600"
                  : "peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-blue-600"
                }`}
            >
              Title
            </label>
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Team Dropdown */}
          <div className="relative z-0 w-full group">
            <Select
              value={formData.teamName || undefined}
              onChange={(value) => setFormData((prev) => ({ ...prev, teamName: value }))}
              placeholder="Select a Team"
              className="w-full"
            >
              {teams.map((team) => (
                <Option key={team._id} value={team._id}>
                  {team.teamName}
                </Option>
              ))}
            </Select>
            {errors.teamName && (
              <p className="text-red-500 text-xs mt-1">{errors.teamName}</p>
            )}
          </div>

          {/* PM Dropdown (AntD Select) */}
          <div className="relative z-0 w-full group">
            <Select
              value={formData.PM || undefined}
              onChange={(value) => setFormData((prev) => ({ ...prev, PM: value }))}
              placeholder="Select a Project Manager"
              className="w-full"
            >
              {pms.map((pm) => (
                <Option key={pm._id} value={pm._id}>
                  {pm.name}
                </Option>
              ))}
            </Select>
            {errors.PM && <p className="text-red-500 text-xs mt-1">{errors.PM}</p>}
          </div>

          {/* Description */}
          <div className="relative z-0 w-full group">
            <textarea
              name="description"
              id="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className={`peer block w-full border-0 border-b-2 bg-transparent py-2.5 px-0 text-gray-900 focus:border-blue-600 focus:outline-none ${errors.description ? "border-red-500" : "border-gray-300"
                }`}
              placeholder=" "
            />
            <label
              htmlFor="description"
              className={`absolute top-3 origin-[0] transform text-gray-500 duration-200 ${formData.description
                  ? "-translate-y-6 scale-75 text-blue-600"
                  : "peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-blue-600"
                }`}
            >
              Description
            </label>
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* File Upload */}
          <div className="relative z-0 w-full group">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              // className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
              <p className="mt-2 text-sm text-gray-500">(Please upload a PDF file)</p>
            {errors.file && (
              <p className="text-red-500 text-xs mt-1">{errors.file}</p>
            )}
          </div>
        </div>

        <Button
          className="w-full h-11 text-lg font-medium shadow-sm hover:shadow-md transition"
          onClick={handleSave}
        >
          {editingId ? "Update Project" : "Assign Project"}
        </Button>
      </Modal>
    </div>
  );
};

export default Projects;
