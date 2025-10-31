// 前后端认证集成测试工具
import { signUp, signIn, signOut, getCurrentUser, changePassword } from '../services/auth';

export interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

export class AuthIntegrationTester {
  private testEmail = `test_${Date.now()}@example.com`;
  private testPassword = 'TestPass123';
  private newPassword = 'NewPass456';
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🚀 开始前后端认证集成测试...');
    console.log(`测试邮箱: ${this.testEmail}`);
    
    // 1. 测试用户注册
    await this.testSignUp();
    
    // 2. 测试用户登录
    await this.testSignIn();
    
    // 3. 测试获取当前用户
    await this.testGetCurrentUser();
    
    // 4. 测试修改密码
    await this.testChangePassword();
    
    // 5. 使用新密码登录
    await this.testSignInWithNewPassword();
    
    // 6. 测试登出
    await this.testSignOut();
    
    // 输出测试结果
    this.printResults();
    
    return this.results;
  }

  private async testSignUp(): Promise<void> {
    try {
      console.log('\n📝 测试用户注册...');
      const user = await signUp(this.testEmail, this.testPassword);

      if (user && user.email === this.testEmail) {
        this.addResult('用户注册', true, '注册成功', user);
        console.log('✅ 注册成功:', user.email);
      } else {
        this.addResult('用户注册', false, '注册返回数据格式不正确', user);
        console.log('❌ 注册失败: 返回数据格式不正确');
      }
    } catch (error: any) {
      this.addResult('用户注册', false, error.message || '注册失败', error);
      console.log('❌ 注册失败:', error.message);
    }
  }

  private async testSignIn(): Promise<void> {
    try {
      console.log('\n🔐 测试用户登录...');
      const user = await signIn(this.testEmail, this.testPassword);
      const token = (window as any).__AUTH_TOKEN__;

      if (user && token) {
        this.addResult('用户登录', true, '登录成功', { user, token });
        console.log('✅ 登录成功:', user.email);
      } else {
        this.addResult('用户登录', false, '登录返回数据格式不正确', { user, token });
        console.log('❌ 登录失败: 返回数据格式不正确');
      }
    } catch (error: any) {
      this.addResult('用户登录', false, error.message || '登录失败', error);
      console.log('❌ 登录失败:', error.message);
    }
  }

  private async testGetCurrentUser(): Promise<void> {
    try {
      console.log('\n👤 测试获取当前用户...');
      const user = await getCurrentUser();
      
      if (user && user.email === this.testEmail) {
        this.addResult('获取当前用户', true, '获取用户信息成功', user);
        console.log('✅ 获取用户信息成功:', user.email);
      } else {
        this.addResult('获取当前用户', false, '获取用户信息失败或数据不正确', user);
        console.log('❌ 获取用户信息失败');
      }
    } catch (error: any) {
      this.addResult('获取当前用户', false, error.message || '获取用户信息失败', error);
      console.log('❌ 获取用户信息失败:', error.message);
    }
  }

  private async testChangePassword(): Promise<void> {
    try {
      console.log('\n🔑 测试修改密码...');
      await changePassword(this.testPassword, this.newPassword);
      
      this.addResult('修改密码', true, '修改密码成功');
      console.log('✅ 修改密码成功');
    } catch (error: any) {
      this.addResult('修改密码', false, error.message || '修改密码失败', error);
      console.log('❌ 修改密码失败:', error.message);
    }
  }

  private async testSignInWithNewPassword(): Promise<void> {
    try {
      console.log('\n🔐 测试使用新密码登录...');
      const user = await signIn(this.testEmail, this.newPassword);
      const token = (window as any).__AUTH_TOKEN__;

      if (user && token) {
        this.addResult('新密码登录', true, '使用新密码登录成功', { user, token });
        console.log('✅ 使用新密码登录成功');
      } else {
        this.addResult('新密码登录', false, '使用新密码登录失败', { user, token });
        console.log('❌ 使用新密码登录失败');
      }
    } catch (error: any) {
      this.addResult('新密码登录', false, error.message || '使用新密码登录失败', error);
      console.log('❌ 使用新密码登录失败:', error.message);
    }
  }

  private async testSignOut(): Promise<void> {
    try {
      console.log('\n🚪 测试用户登出...');
      await signOut();

      // 检查会话令牌与本地缓存是否已清除
      const token = (window as any).__AUTH_TOKEN__;
      const user = localStorage.getItem('auth.user');
      
      if (!token && !user) {
        this.addResult('用户登出', true, '登出成功，会话令牌与本地缓存已清除');
        console.log('✅ 登出成功');
      } else {
        this.addResult('用户登出', false, '登出后会话或本地缓存未完全清除');
        console.log('❌ 登出失败: 会话或本地缓存未完全清除');
      }
    } catch (error: any) {
      this.addResult('用户登出', false, error.message || '登出失败', error);
      console.log('❌ 登出失败:', error.message);
    }
  }

  private addResult(test: string, success: boolean, message: string, data?: any): void {
    this.results.push({ test, success, message, data });
  }

  private printResults(): void {
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}: ${result.message}`);
    });
    
    console.log('='.repeat(50));
    console.log(`总计: ${passed}/${total} 项测试通过`);
    
    if (passed === total) {
      console.log('🎉 所有测试通过！前后端认证集成成功！');
    } else {
      console.log('⚠️  部分测试失败，请检查相关功能');
    }
  }
}

// 导出便捷函数
export const runAuthIntegrationTest = async (): Promise<TestResult[]> => {
  const tester = new AuthIntegrationTester();
  return await tester.runAllTests();
};