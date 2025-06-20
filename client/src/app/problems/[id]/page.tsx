"use client";

import SplitPane from "react-split-pane";
import ProblemDescription from "@/components/problems/ProblemDescription";
import CodeEditor from "@/components/problems/CodeEditor";
import TestCasePanel from "@/components/problems/TestCasePanel";
import { useState,useEffect } from "react";
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchProblemById } from '@/redux/features/problem/problemActions';
import { submitCode } from '@/redux/features/submitCode/submitCodeActions';
import { useParams,useSearchParams } from 'next/navigation';
import { runCodeApi } from "@/lib/api/problem";
import languageMap from "@/lib/utils/languageMap";
import SubmissionResultModal from "@/components/problems/SubmissionResultModal";
import SubmissionsTable from "@/components/problems/SubmissionsTable";
import ProtectedUserRoute from "@/components/shared/ProtectedUserRoute";

const ProblemDetail = () => {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [theme, setTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [output, setOutput] = useState<string | null>(null);
  const [loadingOutput, setLoadingOutput] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [activeTestCaseTab, setActiveTestCaseTab] = useState<"testcase" | "result">("testcase");
  const dispatch = useAppDispatch();
  const { problem, loading, error } = useAppSelector((state) => state.problems);
  const params = useParams();
  const problemId = params.id as string;
  const searchParams = useSearchParams();
  const srNo = searchParams.get('srNo');

  useEffect(() => {
    if (problemId) {
      dispatch(fetchProblemById(problemId));
    }
  }, [dispatch, problemId]);

  useEffect(() => {
    if (problem && problem?.functionSignatures) {
      const defaultCode = problem.functionSignatures[language as keyof typeof problem.functionSignatures];
      setCode(defaultCode || "// Write your code here");
    }
  }, [language, problem]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const handleRunCode = async () => {
    try {
      setLoadingOutput(true);
      const languageId = languageMap[language];
      const result = await runCodeApi({
        sourceCode: code,
        languageId,
        stdin: "", // if you support input, put it here,
        questionId: problemId,
      });
      if (result.stderr) {
        setOutput(result.stderr);
      } else if (result.compile_output) {
        setOutput(result.compile_output);
      } else if (result.error) {
        setOutput(result.error); // This will now show the function signature error in output
      } else {
        setOutput(result.stdout);
      }
      setActiveTestCaseTab("result");   
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Execution failed. Please try again.';
      setOutput(msg); // show error in output panel
    } finally {
      setLoadingOutput(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const languageId = languageMap[language];
    await dispatch(submitCode(code, languageId, problemId));
    setIsModalOpen(true);
    setIsSubmitting(false);
    setActiveTab("submissions")
  };

  return (
  <ProtectedUserRoute>
    <div className="h-screen w-full overflow-hidden bg-gray-100">
      <SplitPane
        split="vertical"
        minSize={300}
        maxSize={-400}
        defaultSize="50%"
      >
        <div className="p-3 bg-gray-50 shadow-md flex flex-col h-full">
          <div className="flex gap-4 mb-4 border-b bg-gray-200 text-xl font-semibold rounded-t-2xl h-10">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-4 py-1 rounded-t-2xl font-semibold cursor-pointer ${
                activeTab === "description"
                  ? "bg-gray-200 border-blue-500 border-b-2"
                  : "text-gray-400"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-4 py-1 rounded-t-md font-semibold cursor-pointer ${
                activeTab === "submissions"
                  ? "bg-gray-200 border-blue-500 border-b-2"
                  : "text-gray-400"
              }`}
            >
              Submissions
            </button>
          </div>
          {activeTab === "description" && (
            <div className="overflow-y-auto flex-1">
              <ProblemDescription problem={problem} srNo={srNo} />
            </div>
          )}

          {activeTab === "submissions" && (
            <div className="overflow-y-auto flex-1">
              <SubmissionsTable submissions={problem?.solutions || []} />
            </div>
          )}
        </div>

        <SplitPane
          split="horizontal"
          minSize={50}
          maxSize={-250}
          defaultSize="55%"
        >
          <div className="p-3 bg-gray-50 shadow-md h-screen w-full">
            <div className="flex justify-start items-center mb-2 bg-gray-200 rounded-t-2xl p-2 h-10 gap-5">
              <h2 className="text-xl font-semibold">Code</h2>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border px-2 py-1 rounded-md text-sm bg-white"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value as "light" | "vs-dark")
                }
                className="border px-2 py-1 rounded-md text-sm bg-white"
              >
                <option value="vs-dark">Dark</option>
                <option value="light">Light</option>
              </select>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="border px-2 py-1 rounded-md text-sm bg-white"
              >
                {[10, 12, 14, 16, 18, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-[400px]">
              <CodeEditor
                language={language}
                value={code}
                onChange={setCode}
                theme={theme}
                fontSize={fontSize}
              />
            </div>
          </div>

          <div className="p-3 bg-white shadow-md h-full">
            <div className="flex justify-end mr-5 mb-3">
              <div className="mr-2">
                <button
                  onClick={handleRunCode}
                  className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 cursor-pointer"
                >
                  Run
                </button>
              </div>
              <div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 cursor-pointer"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
            <TestCasePanel
              testCases={problem?.testCases ?? []}
              output={output}
              loadingOutput={loadingOutput}
              activeSection={activeTestCaseTab}
              setActiveSection={setActiveTestCaseTab}
            />
          </div>
        </SplitPane>
      </SplitPane>
      <SubmissionResultModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  </ProtectedUserRoute>
  );
};

export default ProblemDetail;
