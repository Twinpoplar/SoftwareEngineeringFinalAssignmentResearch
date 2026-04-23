import { useMemo, useState } from 'react';
import { Users, UserPlus, Trash2, Pencil } from 'lucide-react';
import { Layout, PageHeader } from '../../components/common/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import { useAdminCreateUser, useAdminRemoveUser, useAdminUpdateStudentId, useAdminUsers } from '../../queries/userManagementQueries';

export default function UserManagement() {
  const toast = useToast();
  const [roleFilter, setRoleFilter] = useState<'student' | 'teacher' | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'student' | 'teacher'>('student');
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createStudentId, setCreateStudentId] = useState('');
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState('');

  const [removeUserId, setRemoveUserId] = useState<string | null>(null);

  const queryRole = roleFilter === 'all' ? undefined : roleFilter;
  const { data: users = [], isLoading } = useAdminUsers(queryRole);
  const createMutation = useAdminCreateUser();
  const updateStudentIdMutation = useAdminUpdateStudentId();
  const removeMutation = useAdminRemoveUser();

  const filteredUsers = useMemo(() => {
    return users.filter((u) => u.role !== 'admin');
  }, [users]);

  const resetCreateForm = () => {
    setCreateRole('student');
    setCreateEmail('');
    setCreateFullName('');
    setCreateStudentId('');
  };

  const openCreate = () => {
    resetCreateForm();
    setCreatedTempPassword(null);
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const email = createEmail.trim().toLowerCase();
      const fullName = createFullName.trim();
      const studentId = createStudentId.trim();
      if (!email || !fullName) {
        toast.error('请填写邮箱与姓名');
        return;
      }
      const result = await createMutation.mutateAsync({
        email,
        fullName,
        role: createRole,
        studentId: studentId || undefined,
      });
      setCreatedTempPassword(result.temp_password);
      toast.success('账号已创建');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const openEditStudentId = (id: string, currentStudentId: string) => {
    setEditUserId(id);
    setEditStudentId(currentStudentId ?? '');
  };

  const handleSaveStudentId = async () => {
    if (!editUserId) return;
    try {
      await updateStudentIdMutation.mutateAsync({ id: editUserId, studentId: editStudentId.trim() });
      toast.success('学号已更新');
      setEditUserId(null);
      setEditStudentId('');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRemove = async () => {
    if (!removeUserId) return;
    try {
      await removeMutation.mutateAsync(removeUserId);
      toast.success('账号已移除（禁用）');
      setRemoveUserId(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (isLoading) return <LoadingSpinner text="正在加载用户..." fullScreen />;

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="账号管理"
          subtitle="新增/移除学生与教师账号，支持修改学号（不支持修改账密）"
          icon={<Users className="w-6 h-6" />}
          action={
            <Button icon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>
              新增账号
            </Button>
          }
        />

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>角色筛选：</span>
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'student' | 'teacher' | 'all')}
            >
              <option value="all">全部</option>
              <option value="student">学生</option>
              <option value="teacher">教师</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">共 {filteredUsers.length} 个账号</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-6 py-4 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
            <div className="col-span-3">邮箱</div>
            <div className="col-span-2">姓名</div>
            <div className="col-span-2">角色</div>
            <div className="col-span-2">学号</div>
            <div className="col-span-1">状态</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-500">暂无数据</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <div key={u.id} className="grid grid-cols-12 gap-3 px-6 py-4 items-center">
                  <div className="col-span-3 text-sm text-gray-900 truncate">{u.email}</div>
                  <div className="col-span-2 text-sm text-gray-700 truncate">{u.full_name}</div>
                  <div className="col-span-2 text-sm text-gray-700">{u.role === 'student' ? '学生' : '教师'}</div>
                  <div className="col-span-2 text-sm text-gray-700 truncate">{u.student_id || '-'}</div>
                  <div className="col-span-1 text-sm">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? '启用' : '禁用'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Pencil className="w-4 h-4" />}
                      onClick={() => openEditStudentId(u.id, u.student_id)}
                    >
                      学号
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => setRemoveUserId(u.id)}
                    >
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setCreatedTempPassword(null);
          }}
          title="新增账号"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreatedTempPassword(null);
                }}
              >
                关闭
              </Button>
              <Button loading={createMutation.isPending} onClick={handleCreate}>
                创建
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">角色</label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'student' | 'teacher')}
                >
                  <option value="student">学生</option>
                  <option value="teacher">教师</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">学号</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  value={createStudentId}
                  onChange={(e) => setCreateStudentId(e.target.value)}
                  placeholder="可选"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">邮箱</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">姓名</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              新创建账号会生成一次性临时密码，创建后会展示给你保存。系统不提供修改密码功能。
            </div>

            {createdTempPassword && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-sm font-semibold text-emerald-800 mb-2">临时密码（请立即保存）</div>
                <div className="font-mono text-emerald-900 text-base break-all">{createdTempPassword}</div>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={editUserId !== null}
          onClose={() => setEditUserId(null)}
          title="修改学号"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditUserId(null)}>
                取消
              </Button>
              <Button loading={updateStudentIdMutation.isPending} onClick={handleSaveStudentId}>
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="text-sm text-gray-600">仅支持修改学号，不支持修改账号与密码。</div>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={editStudentId}
              onChange={(e) => setEditStudentId(e.target.value)}
              placeholder="请输入学号"
            />
          </div>
        </Modal>

        <Modal
          isOpen={removeUserId !== null}
          onClose={() => setRemoveUserId(null)}
          title="确认移除账号"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setRemoveUserId(null)}>
                取消
              </Button>
              <Button variant="danger" loading={removeMutation.isPending} onClick={handleRemove}>
                确认移除
              </Button>
            </>
          }
        >
          <div className="text-sm text-gray-700">移除后该账号将被禁用，无法登录。确认继续吗？</div>
        </Modal>
      </div>
    </Layout>
  );
}

